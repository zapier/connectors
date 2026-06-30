#!/usr/bin/env node
/**
 * Connector CLI entry point.
 *
 * Delegates to the compiled CLI (`dist/cli.js`, shipped in the npm tarball —
 * runs on any Node) when present, else the TypeScript source (`cli.ts` — needs
 * Node 22.18+ type-stripping, or Bun). Under Node it first runs a readiness
 * gate that ports the old preflight checks: it bails with actionable guidance
 * when `node_modules` is missing, or when the `.ts` source can't run on this
 * Node. Under Bun the gate is skipped — Bun runs `.ts` directly and
 * auto-installs missing imports.
 *
 * Managed by @zapier/connectors-dev — do not edit; synced byte-for-byte
 * across every connector.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const hasDist = existsSync(join(dir, "dist"));

// Node-only readiness gate. Bun runs `.ts` directly and auto-installs missing
// imports, so neither check applies under it.
if (!process.versions.bun) {
  if (!existsSync(join(dir, "node_modules"))) {
    bail(dependenciesRecommendation());
  }
  // The .ts source only runs on Node 22.18+ (native type-stripping). A compiled
  // dist/ runs on any Node, so it's only a problem when there's no dist/.
  if (!hasDist && !nodeStripsTypes()) {
    bail(
      `this Node (v${process.versions.node}) can't run the TypeScript source — ` +
        `native type-stripping needs Node 22.18+. Upgrade Node, or run with Bun: ` +
        `\`bun ${join(dir, "cli.js")} --help\`.`,
    );
  }
}

const target = hasDist ? join(dir, "dist", "cli.js") : join(dir, "cli.ts");

// Spawn the target as a subprocess (not import()) so import.meta.main is true
// and runDispatchCli executes. Using process.execPath keeps it runtime-adaptive:
// `node cli.js` runs the target under Node, `bun cli.js` runs it under Bun.
const { status } = spawnSync(
  process.execPath,
  [target, ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(status ?? 1);

// ── helpers ────────────────────────────────────────────────────────────────

/** Node >= 22.18 is where TypeScript type-stripping is on by default. */
function nodeStripsTypes() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  return major > 22 || (major === 22 && minor >= 18);
}

/**
 * Can we create `node_modules/` here right now? A sandbox can deny the write at
 * the syscall while the permission bits still look writable, and at least one
 * sandbox permits creating a file here while denying `mkdir` — so probe with a
 * real `mkdir`/`rmdir`, the install's first on-disk action.
 */
function dirWritable() {
  const probe = join(dir, `.cli-write-test.${process.pid}`);
  try {
    mkdirSync(probe);
    rmdirSync(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Disambiguate the two sandbox failures that block an install, because the
 * fixes differ: a read-only connector dir (run unsandboxed / grant write) vs. a
 * blocked home dir (point the package cache inside this dir via `--cache`).
 */
function dependenciesRecommendation() {
  if (!dirWritable()) {
    return (
      `dependencies are not installed and ${dir} is read-only in this sandbox ` +
      `(a test write failed) — \`npm install\` can't place node_modules here. ` +
      `Run the install with the sandbox disabled, or grant write access to ${dir} ` +
      `(a cache flag won't help — node_modules must land in this directory).`
    );
  }
  return (
    `dependencies are not installed — run ` +
    `\`npm install --cache "${join(dir, ".npm-cache")}"\` in ${dir} ` +
    `(the workspace-local --cache survives a sandbox that blocks ~/.npm; plain ` +
    `\`npm install\` works otherwise).`
  );
}

function bail(recommendation) {
  console.error(
    `Connector setup needed: ${recommendation} ` +
      `Then run \`node ${join(dir, "cli.js")} --help\` to list its scripts.`,
  );
  process.exit(1);
}
