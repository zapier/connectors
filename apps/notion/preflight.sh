#!/usr/bin/env sh
# Connector pre-flight readiness check.
#
# Canonical source: connector-assets/preflight.sh in the Zapier connectors repo.
# Every apps/<app>/preflight.sh is a byte-identical copy synced by
# `pnpm run ensure-connector-assets`. Edit the canonical copy, never the copies.
#
# WHAT THIS IS FOR
#   This script runs inside whatever agent harness installed the connector
#   (Cursor, Claude Code, Codex, Gemini CLI, Goose, ...) — frequently a minimal,
#   network-restricted container. It tells the agent, in one of three verdicts,
#   how to run this connector's scripts here:
#
#     * READY        — a runtime + deps + network are in place; run the scripts.
#     * NEEDS_ACTION — one bootstrap step is missing (e.g. `npm install`); do it
#                      and re-run this script. The check is re-runnable: loop
#                      until READY or DEFER.
#     * DEFER        — the sandbox can't reach the hosts these scripts need, so
#                      recommend the user use Zapier's remote MCP server instead
#                      (it executes the API call server-side, bypassing this
#                      sandbox's network entirely).
#
# WHY POSIX sh (not bash)
#   Minimal sandboxes often ship only BusyBox `sh` with no bash. This script is
#   written to run unchanged under BusyBox sh, dash, and bash, and never hard-
#   requires curl/wget/node/bun/npm — a missing tool degrades to the next probe.
#
# USAGE
#   ./preflight.sh <api-host>
#     <api-host>  the connector's upstream API base (e.g. https://api.example.com)
#                 (the SKILL.md "Step 0" section names the exact host to pass).
#
# OUTPUT (machine-parseable lines an agent can grep)
#   PREFLIGHT_RUNNER: node|bun                                (READY/ESCALATE)
#   PREFLIGHT_LOCAL_WITH_ZAPIER: ok|proxied|blocked|unknown
#   PREFLIGHT_LOCAL_WITHOUT_ZAPIER: ok|proxied|blocked|unknown
#   PREFLIGHT_RECOMMENDATION: <one-line next step>
#
#   A `proxied` path means the runtime's own fetch can't reach the host, but an
#   external tool (curl/wget, which honour HTTP(S)_PROXY) can — i.e. the host is
#   reachable outside this sandbox's default egress, just not by the scripts.
#
# EXIT CODES
#   0  READY         at least one local auth path is viable; run the scripts
#   1  DEFER         no local path possible at all; use the remote MCP
#   2  USAGE         missing <api-host> argument
#   3  NEEDS_ACTION  perform the printed action (install/deps), then re-run
#   4  ESCALATE      reachable only outside the sandbox's default egress — run
#                    with elevated/outside-sandbox network if the harness allows,
#                    otherwise use the remote MCP

set -u

HOST="${1:-}"

# Fixed Zapier endpoints + per-probe network timeout (seconds).
ZAPIER_HOST="https://api.zapier.com"
REMOTE_MCP="https://mcp.zapier.com"
PROBE_TIMEOUT=5

EXIT_READY=0
EXIT_DEFER=1
EXIT_USAGE=2
EXIT_NEEDS_ACTION=3
EXIT_ESCALATE=4

# Directory this script lives in — deps + scripts are resolved relative to it,
# not the caller's cwd, so `./preflight.sh` works from anywhere.
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

has() {
  command -v "$1" >/dev/null 2>&1
}

# Node >= 22.18 is the connector baseline (native .ts stripping). Anything older
# is treated as "no Node" so we fall back to Bun.
node_ge_2218() {
  has node || return 1
  v=$(node -v 2>/dev/null) || return 1
  v=${v#v}
  major=${v%%.*}
  rest=${v#*.}
  minor=${rest%%.*}
  case "$major" in '' | *[!0-9]*) return 1 ;; esac
  case "$minor" in '' | *[!0-9]*) minor=0 ;; esac
  [ "$major" -gt 22 ] && return 0
  [ "$major" -eq 22 ] && [ "$minor" -ge 18 ] && return 0
  return 1
}

# A runtime-based reachability check using global fetch. Mirrors curl semantics:
# ANY HTTP response (even 4xx/5xx) means the host is reachable; only a transport
# error (DNS / connect refused / timeout) means blocked.
runtime_probe() {
  # $1 = node|bun, $2 = url
  "$1" -e '
    const url = process.argv[1];
    const ms = (Number(process.argv[2]) || 5) * 1000;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), ms);
    fetch(url, { method: "HEAD", signal: ac.signal })
      .then(() => { clearTimeout(t); process.exit(0); })
      .catch(() => { clearTimeout(t); process.exit(1); });
  ' "$2" "$PROBE_TIMEOUT" >/dev/null 2>&1
}

# Reachability via external tools (curl -> wget -> bash /dev/tcp). These honour
# HTTP(S)_PROXY env vars, so they can reach hosts the runtime's proxy-blind fetch
# cannot. Returns via exit status (echoes nothing):
#   0  reachable     1  blocked     2  no external probe tool available
ext_reach() {
  url="$1"
  if has curl; then
    curl -s -o /dev/null --max-time "$PROBE_TIMEOUT" "$url" >/dev/null 2>&1
    return
  fi
  if has wget; then
    wget -q -T "$PROBE_TIMEOUT" -O /dev/null "$url" >/dev/null 2>&1
    # 0 ok; 5 TLS, 6 auth, 8 server-error-response all mean a connection was made
    # (host reachable). BusyBox wget collapses many codes to 1 → treated blocked.
    case "$?" in 0 | 5 | 6 | 8) return 0 ;; *) return 1 ;; esac
  fi
  if [ -n "${BASH_VERSION:-}" ]; then
    hostport=${url#*://}
    hostport=${hostport%%/*}
    case "$url" in
      https://*) port=443 ;;
      http://*) port=80 ;;
      *) port=443 ;;
    esac
    case "$hostport" in *:*) port=${hostport##*:}; hostport=${hostport%%:*} ;; esac
    (exec 3<>"/dev/tcp/$hostport/$port") 2>/dev/null && return 0
    return 1
  fi
  return 2
}

# Echoes: ok | proxied | blocked | unknown
#   ok       the runtime's own fetch reached the host — scripts will work
#   proxied  fetch blocked, but an external tool reached it → host is reachable
#            outside this sandbox's default egress, just not by the scripts
#   blocked  nothing could reach it — truly walled off
#   unknown  no probe tool available at all (no runtime yet, no curl/wget)
#
# Runtime (node/bun) is probed FIRST on purpose. Connector scripts make their API
# calls through Node/Bun's global fetch (undici), which — unlike curl/wget — does
# NOT honour HTTP(S)_PROXY by default. A sandbox that allow-lists egress through a
# proxy lets curl succeed while the real fetch is firewalled, so a curl-first
# probe reports a false `ok` (the "probe says reachable, script then dies on
# fetch" trap). We probe with the workload's runtime, then — only if it fails —
# consult the proxy-aware external tools to tell `proxied` apart from `blocked`.
probe() {
  url="$1"
  if node_ge_2218 || has node; then
    runtime_probe node "$url" && { echo ok; return; }
    ext_reach "$url" && { echo proxied; return; }
    echo blocked
    return
  fi
  if has bun; then
    runtime_probe bun "$url" && { echo ok; return; }
    ext_reach "$url" && { echo proxied; return; }
    echo blocked
    return
  fi
  # No JS runtime yet — only external tools to go on (pre-runtime, optimistic:
  # whatever they say is the best signal available until a runtime is installed).
  ext_reach "$url"
  case "$?" in
    0) echo ok ;;
    2) echo unknown ;;
    *) echo blocked ;;
  esac
}

# Format a probe result for the READY/ESCALATE output. The `unknown` arm is a
# defensive fallback: `unknown` means no probe tool exists, but node/bun ARE
# probe tools, so an `unknown` result implies no runtime — which exits
# NEEDS_ACTION at step 2 before this output is ever reached. We never equate it
# with `blocked`: "no way to test" is not "unreachable", and the runtime install
# it asks for also restores a working probe for the re-run.
fmt_path() {
  case "$1" in
    ok) echo "ok" ;;
    proxied) echo "reachable outside the sandbox only → the runtime's fetch is blocked here, but curl/proxy reached it" ;;
    blocked) echo "blocked → this sandbox can't reach the host this auth mode needs" ;;
    *) echo "unknown → no tool available to test reachability; will be confirmed when a script actually runs" ;;
  esac
}

print_remote_mcp() {
  echo "PREFLIGHT_REMOTE_MCP: ${REMOTE_MCP}"
  echo "  Runs the API call server-side, so this sandbox's network limits don't"
  echo "  apply. Tell the user to set up a Zapier MCP server at ${REMOTE_MCP} and"
  echo "  follow the instructions there to add it."
}

# ---- 0) Input --------------------------------------------------------------
if [ -z "$HOST" ]; then
  echo "usage: ./preflight.sh <api-host>   # the connector's API base — see SKILL.md Step 0"
  echo "PREFLIGHT_RECOMMENDATION: usage — pass the connector's API host as the first argument (see SKILL.md Step 0)."
  exit "$EXIT_USAGE"
fi

# ---- 1) Network first ------------------------------------------------------
# Cheapest, most decisive signal: if neither auth path's host is reachable, no
# amount of local install will help — recommend the remote MCP immediately.
with_zapier=$(probe "$ZAPIER_HOST")   # gates the with-Zapier path (*_ZAPIER_CONNECTION_ID)
without_zapier=$(probe "$HOST")       # gates the without-Zapier path (*_TOKEN)

if [ "$with_zapier" = blocked ] && [ "$without_zapier" = blocked ]; then
  echo "PREFLIGHT_LOCAL_WITH_ZAPIER: blocked"
  echo "PREFLIGHT_LOCAL_WITHOUT_ZAPIER: blocked"
  echo "PREFLIGHT_RECOMMENDATION: defer — this sandbox cannot reach ${ZAPIER_HOST} or ${HOST} (no domain allow-listing); recommend the user use the remote MCP."
  print_remote_mcp
  exit "$EXIT_DEFER"
fi

# ---- 2) Runtime to execute the .ts scripts ---------------------------------
# Prefer Node >= 22.18 (documented baseline, native TS strip); fall back to Bun.
if node_ge_2218; then
  runner=node
elif has bun; then
  runner=bun
else
  echo "PREFLIGHT_RECOMMENDATION: not-ready — no Node 22.18+ or Bun found. Install Node 22.18+ (ships npm) or Bun, then re-run \`./preflight.sh ${HOST}\`."
  exit "$EXIT_NEEDS_ACTION"
fi

# ---- 3) Dependencies -------------------------------------------------------
# Only Node needs node_modules pre-populated. Bun auto-installs the declared
# deps on the fly when node_modules is absent (default --install=auto), so a
# `bun <script>` run is self-sufficient — no separate `bun install` step.
if [ "$runner" = node ] && [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  if has npm; then
    echo "PREFLIGHT_RECOMMENDATION: not-ready — dependencies are not installed. Run \`npm install\` in ${SCRIPT_DIR}, then re-run \`./preflight.sh ${HOST}\`."
  else
    # node >= 22.18 ships npm, so a missing npm means it was removed from the
    # Node install. Restore it and install deps in one step (no extra re-run).
    echo "PREFLIGHT_RECOMMENDATION: not-ready — npm is missing (it ships with Node 22.18+). Reinstall/repair Node 22.18+, then run \`npm install\` in ${SCRIPT_DIR}, then re-run \`./preflight.sh ${HOST}\`."
  fi
  exit "$EXIT_NEEDS_ACTION"
fi

# ---- 4) Ready or escalate --------------------------------------------------
# Runtime + deps are in place and we did NOT defer (so the hosts aren't both
# blocked). Two cases remain:
#   * at least one path is `ok`           → READY: run the scripts directly.
#   * no path is `ok`, but one is proxied → ESCALATE: the runtime's fetch is
#     blocked here, yet the host is reachable outside the sandbox's default
#     egress. If the harness can run with elevated/outside-sandbox network
#     (e.g. ask the user to approve egress), proceed that way; otherwise this is
#     effectively a defer — use the remote MCP.
echo "PREFLIGHT_RUNNER: ${runner}"
echo "PREFLIGHT_LOCAL_WITH_ZAPIER: $(fmt_path "$with_zapier")"
echo "PREFLIGHT_LOCAL_WITHOUT_ZAPIER: $(fmt_path "$without_zapier")"

if [ "$with_zapier" = ok ] || [ "$without_zapier" = ok ]; then
  echo "PREFLIGHT_RECOMMENDATION: ready — execute scripts with \`${runner} ${SCRIPT_DIR}/scripts/<name>.ts\` using an auth path marked ok above."
  exit "$EXIT_READY"
fi

echo "PREFLIGHT_RECOMMENDATION: escalate — ${runner}'s network (fetch) is blocked here, but the host is reachable outside this sandbox's default egress. If your harness can run the script with elevated/outside-the-sandbox network access (e.g. ask the user to approve it), proceed: \`${runner} ${SCRIPT_DIR}/scripts/<name>.ts\`. If it cannot, defer to the remote MCP below."
print_remote_mcp
exit "$EXIT_ESCALATE"
