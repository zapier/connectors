#!/usr/bin/env sh
# Connector pre-flight readiness check.
#
# Canonical source: connector-assets/preflight.sh in the Zapier connectors repo.
# Every apps/<app>/preflight.sh is a byte-identical copy synced by
# `pnpm run ensure-connector-assets`. Edit the canonical copy, never the copies.
#
# Runs inside whatever agent harness installed the connector (Cursor, Claude
# Code, Codex, Gemini CLI, Goose, ...) — often a minimal container — and answers
# ONE question: how do I run the TypeScript scripts here? It picks a runtime —
# Node 22.18+ when it can already resolve the connector's deps, else an explicit
# install step (`npm install`, or `bun install` when only Bun is present) — and
# tells the agent the exact command to run (see EXIT CODES). When deps are
# missing it disambiguates the two sandbox failures that block an install: a
# read-only connector dir (must run unsandboxed / be granted write) vs. a
# blocked home dir (point the package cache inside this dir). Both surface as a
# misleading `EPERM`, so the recommendation names the actual fix.
#
# NEEDS_ACTION is a single self-verifying step (install a runtime / deps), not a
# loop: do it, then run a script. The action confirms its own success and the
# first `--help` run is the authoritative check, so re-running this pre-flight to
# reconfirm is optional, not required.
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

# Are the connector's declared deps installed where Node would find them? Node
# won't fetch — they must be on disk (this dir's node_modules or an ancestor's).
# Reads the connector's own package.json, so this stays connector-agnostic. A
# bare `[ -d node_modules ]` is the wrong test: under pnpm/monorepo layouts the
# deps can live in an ancestor (or be hoisted), and a local node_modules can
# exist without the package being present. We check each dep's package.json
# exists in one of Node's resolution paths rather than `require.resolve(name)`,
# because resolving the package ENTRY can fail for ESM-only / `exports`-map
# packages even when they're fully installed and importable.
node_resolves() {
  ( CDPATH= cd -- "$SCRIPT_DIR" && node -e 'const fs=require("fs"),path=require("path");const d=require("./package.json").dependencies||{};for(const k of Object.keys(d)){const ps=require.resolve.paths(k)||[];if(!ps.some(b=>fs.existsSync(path.join(b,k,"package.json"))))process.exit(1);}' ) >/dev/null 2>&1
}

# Can we actually WRITE into this directory right now? Any dep install must land
# `node_modules/` here, so if the harness mounts the connector read-only (common
# when skills live under ~/.<agent>/skills, outside the agent's writable
# workspace) no install can succeed in place — the only fixes are to run it
# unsandboxed or grant write access. Two deliberate choices:
#   - Probe with a real create+remove, not `[ -w ]`: a sandbox denies the write
#     at the syscall while the permission bits still look writable.
#   - Probe by creating a DIRECTORY (`mkdir`), not a file: that's the install's
#     very first on-disk action (node_modules/ and the cache dirs), and at least
#     one sandbox (Claude Code) permits creating a file here while denying
#     `mkdir` — a file-based probe reports writable and the install then EPERMs.
dir_writable() {
  _t="$SCRIPT_DIR/.preflight-write-test.$$"
  mkdir "$_t" 2>/dev/null || return 1
  rmdir "$_t" 2>/dev/null
  return 0
}

# ---- 1) Pick a runtime -----------------------------------------------------
# Node 22.18+ (native TS strip) is the baseline and the preferred runner whenever
# it's present — it runs the .ts scripts directly. Bun is the fallback runner
# only when there's no usable Node. We DON'T lean on Bun's implicit auto-install:
# it's silently suppressed by any ancestor node_modules (monorepo layouts) and
# fails the same way Node's `npm install` does under a sandbox that blocks Bun's
# home cache — so missing deps are always an explicit, cache-local install step.
nresolves=false
node_ge_2218 && node_resolves && nresolves=true

if [ "$nresolves" = true ]; then
  runner=node
  ready=true
elif node_ge_2218; then
  runner=node # present but deps unresolved — install step below
  ready=false
elif has bun; then
  runner=bun # no usable Node — Bun runs the scripts; install step below
  ready=false
else
  echo "PREFLIGHT_STATUS: NEEDS_ACTION"
  echo "PREFLIGHT_RECOMMENDATION: no Node 22.18+ or Bun found — install Node 22.18+ (ships npm) or Bun, then run \`<runner> ${SCRIPT_DIR}/scripts/<name>.ts --help\` to discover arguments and credentials."
  exit "$EXIT_NEEDS_ACTION"
fi

# ---- 2) Install deps if the chosen runtime can't run as-is -----------------
# Two distinct sandbox failures to disambiguate, because their fixes differ:
#   a) This directory is READ-ONLY (skills installed outside the agent's
#      writable workspace). No install can place node_modules here — the agent
#      must run it unsandboxed or be granted write access. A cache flag can't
#      help.
#   b) The directory is writable but the HOME dir is sandboxed, so the default
#      ~/.npm / ~/.bun cache write is what EPERMs mid-install. Pointing the cache
#      INSIDE this directory sidesteps that without disabling the sandbox (and is
#      harmless otherwise — just an unused cache dir).
# So probe writability first and recommend accordingly.
if [ "$ready" != true ]; then
  echo "PREFLIGHT_STATUS: NEEDS_ACTION"
  [ "$runner" = bun ] && install_cmd="bun install" || install_cmd="npm install"
  if ! dir_writable; then
    echo "PREFLIGHT_RECOMMENDATION: dependencies are not installed and ${SCRIPT_DIR} is read-only in the current sandbox (a test write there failed) — \`${install_cmd}\` can't place node_modules here. Run the install with the sandbox disabled, or grant the agent write access to ${SCRIPT_DIR} (a cache flag won't help — node_modules must land in this directory); then run \`${runner} ${SCRIPT_DIR}/scripts/<name>.ts --help\` to discover arguments and credentials."
  elif [ "$runner" = bun ]; then
    echo "PREFLIGHT_RECOMMENDATION: dependencies are not installed — run \`BUN_INSTALL_CACHE_DIR=\"${SCRIPT_DIR}/.bun-cache\" bun install\` in ${SCRIPT_DIR} (the workspace-local cache survives a sandbox that blocks ~/.bun; plain \`bun install\` works otherwise), then run \`${runner} ${SCRIPT_DIR}/scripts/<name>.ts --help\` to discover arguments and credentials."
  elif has npm; then
    echo "PREFLIGHT_RECOMMENDATION: dependencies are not installed — run \`npm install --cache \"${SCRIPT_DIR}/.npm-cache\"\` in ${SCRIPT_DIR} (the workspace-local --cache survives a sandbox that blocks ~/.npm; plain \`npm install\` works otherwise), then run \`${runner} ${SCRIPT_DIR}/scripts/<name>.ts --help\` to discover arguments and credentials."
  else
    # node >= 22.18 ships npm, so a missing npm means it was removed from the
    # Node install. Restore it, then install with a workspace-local cache.
    echo "PREFLIGHT_RECOMMENDATION: npm is missing (it ships with Node 22.18+) — reinstall/repair Node 22.18+, run \`npm install --cache \"${SCRIPT_DIR}/.npm-cache\"\` in ${SCRIPT_DIR}, then run \`${runner} ${SCRIPT_DIR}/scripts/<name>.ts --help\` to discover arguments and credentials."
  fi
  exit "$EXIT_NEEDS_ACTION"
fi

# ---- 3) Ready --------------------------------------------------------------
# Runtime + deps are in place — the scripts run.
echo "PREFLIGHT_STATUS: READY"
echo "PREFLIGHT_RUNNER: ${runner}"
echo "PREFLIGHT_RECOMMENDATION: run \`${runner} ${SCRIPT_DIR}/scripts/<name>.ts --help\` to discover arguments and credentials, then run the script with the required env vars set."
exit "$EXIT_READY"
