#!/usr/bin/env sh
# Connector pre-flight readiness check.
#
# Canonical source: connector-assets/preflight.sh in the Zapier connectors repo.
# Every apps/<app>/preflight.sh is a byte-identical copy synced by
# `pnpm run ensure-connector-assets`. Edit the canonical copy, never the copies.
#
# Runs inside whatever agent harness installed the connector (Cursor, Claude
# Code, Codex, Gemini CLI, Goose, ...) — often a minimal container — and answers
# ONE question: how do I run the TypeScript scripts here? It detects a usable
# runtime (Node 22.18+ or Bun) and that dependencies are installed, then tells
# the agent the exact command to run (see EXIT CODES).
#
# NEEDS_ACTION is a single self-verifying step (install a runtime / `npm
# install`), not a loop: do it, then run a script. The action confirms its own
# success and the first `--help` run is the authoritative check, so re-running
# this pre-flight to reconfirm is optional, not required.
#
# THE AGENT CONTRACT IS THE STDOUT, NOT THIS HEADER. Agents don't read this file;
# they run it and parse the `PREFLIGHT_*` lines — each value starts with a stable
# token (parse as `KEY: (\w+)`), with an optional human gloss in parens, and
# `PREFLIGHT_RECOMMENDATION` is the one-line next step. SKILL.md "Step 0" is the
# agent-facing spec; this header is for maintainers of the canonical script.
#
# WHY POSIX sh (not bash)
#   Minimal sandboxes often ship only BusyBox `sh` with no bash. This script runs
#   unchanged under BusyBox sh, dash, and bash, and never hard-requires
#   node/bun/npm — a missing runtime degrades to a NEEDS_ACTION instruction.
#
# EXIT CODES (the verdict; also emitted on PREFLIGHT_STATUS)
#   0  READY         a runtime + deps are in place; run the scripts
#   1  NEEDS_ACTION  perform the printed action (install runtime / deps), then
#                    run a script — re-running this check is optional

set -u

EXIT_READY=0
EXIT_NEEDS_ACTION=1

# Directory this script lives in — deps + scripts are resolved relative to it,
# not the caller's cwd, so `./preflight.sh` works from anywhere.
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
RERUN="./preflight.sh"

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

# ---- 1) Runtime to execute the .ts scripts ---------------------------------
# Prefer Node >= 22.18 (documented baseline, native TS strip); fall back to Bun.
if node_ge_2218; then
  runner=node
elif has bun; then
  runner=bun
else
  echo "PREFLIGHT_STATUS: NEEDS_ACTION"
  echo "PREFLIGHT_RECOMMENDATION: no Node 22.18+ or Bun found — install Node 22.18+ (ships npm) or Bun, then run a script (re-run \`${RERUN}\` only if you want to reconfirm)."
  exit "$EXIT_NEEDS_ACTION"
fi

# ---- 2) Dependencies -------------------------------------------------------
# Only Node needs node_modules pre-populated. Bun auto-installs the declared
# deps on the fly when node_modules is absent (default --install=auto), so a
# `bun <script>` run is self-sufficient — no separate `bun install` step.
if [ "$runner" = node ] && [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "PREFLIGHT_STATUS: NEEDS_ACTION"
  if has npm; then
    echo "PREFLIGHT_RECOMMENDATION: dependencies are not installed — run \`npm install\` in ${SCRIPT_DIR}, then run a script (re-run \`${RERUN}\` only if you want to reconfirm)."
  else
    # node >= 22.18 ships npm, so a missing npm means it was removed from the
    # Node install. Restore it and install deps in one step.
    echo "PREFLIGHT_RECOMMENDATION: npm is missing (it ships with Node 22.18+) — reinstall/repair Node 22.18+, run \`npm install\` in ${SCRIPT_DIR}, then run a script (re-run \`${RERUN}\` only if you want to reconfirm)."
  fi
  exit "$EXIT_NEEDS_ACTION"
fi

# ---- 3) Ready --------------------------------------------------------------
# Runtime + deps are in place — the scripts can run.
echo "PREFLIGHT_STATUS: READY"
echo "PREFLIGHT_RUNNER: ${runner}"
echo "PREFLIGHT_RECOMMENDATION: run scripts with \`${runner} ${SCRIPT_DIR}/scripts/<name>.ts\`. Always run a script with \`--help\` first to learn the arguments and environment variables it requires."
exit "$EXIT_READY"
