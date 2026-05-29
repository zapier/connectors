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
# OUTPUT (machine-parseable lines an agent can grep). Every value starts with a
# STABLE TOKEN (parse it with `KEY: (\w+)`); any human gloss follows in parens.
#   PREFLIGHT_STATUS: READY|NEEDS_ACTION|ESCALATE|DEFER|USAGE  (always — the verdict)
#   PREFLIGHT_RUNNER: node|bun                                (READY/ESCALATE)
#   PREFLIGHT_LOCAL_WITH_ZAPIER: ok|proxied|blocked           (READY/ESCALATE/DEFER)
#   PREFLIGHT_LOCAL_WITHOUT_ZAPIER: ok|proxied|blocked        (READY/ESCALATE/DEFER)
#   PREFLIGHT_WITH_ZAPIER_SDK: installed|missing              (when with-Zapier reachable)
#   PREFLIGHT_RECOMMENDATION: <one-line human next step>      (always; names the
#                              remote MCP URL on DEFER/ESCALATE)
#
# Read PREFLIGHT_STATUS first — it's the single verdict. A `proxied` path means
# the runtime's own fetch can't reach the host, but an external tool (curl/wget,
# which honour HTTP(S)_PROXY) can — reachable outside this sandbox's default
# egress, just not by the scripts.
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

# Format a probe result as `<token> (<short human gloss>)`. The token is always
# the first word so an agent can parse it with `: (\w+)`; the parenthetical is
# for humans. `unknown` is a defensive fallback (no probe tool → implies no
# runtime, which exits NEEDS_ACTION at step 2 before this is reached) and is
# never equated with `blocked`.
fmt_path() {
  case "$1" in
    ok) echo "ok" ;;
    proxied) echo "proxied (reachable outside this sandbox's egress, not by the runtime's fetch)" ;;
    blocked) echo "blocked (unreachable from this sandbox)" ;;
    *) echo "unknown (no tool available to test reachability)" ;;
  esac
}

# ---- 0) Input --------------------------------------------------------------
if [ -z "$HOST" ]; then
  echo "PREFLIGHT_STATUS: USAGE"
  echo "PREFLIGHT_RECOMMENDATION: pass the connector's API host as the first argument — \`./preflight.sh <api-host>\` (see SKILL.md Step 0)."
  exit "$EXIT_USAGE"
fi

# ---- 1) Network first ------------------------------------------------------
# Cheapest, most decisive signal: if neither auth path's host is reachable, no
# amount of local install will help — recommend the remote MCP immediately.
with_zapier=$(probe "$ZAPIER_HOST")   # gates the with-Zapier path (*_ZAPIER_CONNECTION_ID)
without_zapier=$(probe "$HOST")       # gates the without-Zapier path (*_TOKEN)

if [ "$with_zapier" = blocked ] && [ "$without_zapier" = blocked ]; then
  echo "PREFLIGHT_STATUS: DEFER"
  echo "PREFLIGHT_LOCAL_WITH_ZAPIER: $(fmt_path "$with_zapier")"
  echo "PREFLIGHT_LOCAL_WITHOUT_ZAPIER: $(fmt_path "$without_zapier")"
  echo "PREFLIGHT_RECOMMENDATION: this sandbox can't reach ${ZAPIER_HOST} or ${HOST}, even via a proxy — local execution is impossible. Tell the user to set up a Zapier MCP server at ${REMOTE_MCP} and follow its instructions; it runs the API call server-side."
  exit "$EXIT_DEFER"
fi

# ---- 2) Runtime to execute the .ts scripts ---------------------------------
# Prefer Node >= 22.18 (documented baseline, native TS strip); fall back to Bun.
if node_ge_2218; then
  runner=node
elif has bun; then
  runner=bun
else
  echo "PREFLIGHT_STATUS: NEEDS_ACTION"
  echo "PREFLIGHT_RECOMMENDATION: no Node 22.18+ or Bun found — install Node 22.18+ (ships npm) or Bun, then re-run \`./preflight.sh ${HOST}\`."
  exit "$EXIT_NEEDS_ACTION"
fi

# ---- 3) Dependencies -------------------------------------------------------
# Only Node needs node_modules pre-populated. Bun auto-installs the declared
# deps on the fly when node_modules is absent (default --install=auto), so a
# `bun <script>` run is self-sufficient — no separate `bun install` step.
if [ "$runner" = node ] && [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "PREFLIGHT_STATUS: NEEDS_ACTION"
  if has npm; then
    echo "PREFLIGHT_RECOMMENDATION: dependencies are not installed — run \`npm install\` in ${SCRIPT_DIR}, then re-run \`./preflight.sh ${HOST}\`."
  else
    # node >= 22.18 ships npm, so a missing npm means it was removed from the
    # Node install. Restore it and install deps in one step (no extra re-run).
    echo "PREFLIGHT_RECOMMENDATION: npm is missing (it ships with Node 22.18+) — reinstall/repair Node 22.18+, run \`npm install\` in ${SCRIPT_DIR}, then re-run \`./preflight.sh ${HOST}\`."
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
if [ "$with_zapier" = ok ] || [ "$without_zapier" = ok ]; then
  verdict=READY
else
  verdict=ESCALATE
fi
echo "PREFLIGHT_STATUS: ${verdict}"
echo "PREFLIGHT_RUNNER: ${runner}"
echo "PREFLIGHT_LOCAL_WITH_ZAPIER: $(fmt_path "$with_zapier")"
echo "PREFLIGHT_LOCAL_WITHOUT_ZAPIER: $(fmt_path "$without_zapier")"

# The with-Zapier path (*_ZAPIER_CONNECTION_ID) pulls in the OPTIONAL peer
# @zapier/zapier-sdk through a LAZY `import()`. It must already be on disk:
#   * `npm install` does NOT pull optional peers, so it's never there by default.
#   * Bun's auto-install is not a reliable substitute: it only fetches missing
#     imports when there's no node_modules dir, and because the import is lazy it
#     would fetch mid-run from the npm registry — a host this sandbox may block
#     even when the API host is reachable. So we require the peer present, not
#     fetched on the fly.
# Only report when the with-Zapier host is reachable (ok/proxied) — nothing to
# install for if it's walled off.
if [ "$with_zapier" != blocked ] && [ "$with_zapier" != unknown ]; then
  if [ -d "$SCRIPT_DIR/node_modules/@zapier/zapier-sdk" ]; then
    echo "PREFLIGHT_WITH_ZAPIER_SDK: installed"
  else
    if [ "$runner" = bun ]; then add_sdk="bun add @zapier/zapier-sdk"; else add_sdk="npm install @zapier/zapier-sdk"; fi
    echo "PREFLIGHT_WITH_ZAPIER_SDK: missing — the with-Zapier path needs the optional peer; before using *_ZAPIER_CONNECTION_ID run \`${add_sdk}\` in ${SCRIPT_DIR} (match the version range in package.json). The without-Zapier path (*_TOKEN) needs no extra install."
  fi
fi

if [ "$verdict" = READY ]; then
  echo "PREFLIGHT_RECOMMENDATION: run scripts with \`${runner} ${SCRIPT_DIR}/scripts/<name>.ts\`, picking an auth path marked \`ok\` above — with-Zapier (set *_ZAPIER_CONNECTION_ID) or without-Zapier (set *_TOKEN). Before the with-Zapier path, check PREFLIGHT_WITH_ZAPIER_SDK."
  exit "$EXIT_READY"
fi

echo "PREFLIGHT_RECOMMENDATION: ${runner}'s fetch is blocked in this sandbox, but the host is reachable outside it. If your harness can run with elevated/outside-the-sandbox network (e.g. ask the user to approve egress), run \`${runner} ${SCRIPT_DIR}/scripts/<name>.ts\`. Otherwise tell the user to set up a Zapier MCP server at ${REMOTE_MCP}."
exit "$EXIT_ESCALATE"
