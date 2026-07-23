#!/usr/bin/env node
/**
 * Connector CLI entry point.
 *
 * Delegates to the compiled CLI (`dist/cli.js`, shipped in the npm tarball —
 * runs on any Node) when present, else the TypeScript source (`cli.ts` — needs
 * Node 22.18+ type-stripping, or Bun). When falling back to the `.ts` source
 * under Node it first runs a readiness gate that ports the old preflight checks:
 * it bails with actionable guidance when the `.ts` source can't run on this Node
 * (needs 22.18+) or when its deps aren't installed locally. The gate is skipped
 * under Bun (runs `.ts` directly, auto-installing imports) and whenever a `dist/`
 * is present: the published/installed package runs on any Node, and its deps were
 * resolved by the package manager — often hoisted to a parent `node_modules`
 * (e.g. npx's `_npx` cache) that a literal `./node_modules` probe here can't see.
 *
 * Managed by @zapier/connectors-dev — do not edit; synced byte-for-byte
 * across every connector.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const hasDist = existsSync(join(dir, "dist"));

// Readiness gate for the source (skill) route only. It's skipped under Bun (runs
// `.ts` directly, auto-installing imports) and whenever a `dist/` is present: the
// published/installed package runs on any Node, and its deps were resolved by the
// package manager — often hoisted to a parent `node_modules` (e.g. npx's `_npx`
// cache) that the literal `./node_modules` probe below can't see, so running it
// there would be a false alarm.
if (!process.versions.bun && !hasDist) {
  // Runtime capability before dependencies. If this Node can't run the `.ts`
  // source, `npm install` isn't the fix — the npx and Bun fallbacks below don't
  // need it (npx fetches the prebuilt package; Bun auto-installs imports).
  // Checking node_modules first would send an old-Node agent through a pointless
  // install that still can't run the source. The .ts source needs Node 22.18+
  // (native type-stripping).
  if (!nodeStripsTypes()) {
    const pkg = packageName();
    // A connector's devDependencies (tsup) make a local build a real fix here,
    // not just a runtime switch: build once and this Node can run the compiled
    // dist/ it can't run the TypeScript source on. Check for the tsup bin
    // specifically, not just node_modules/ — a prior `--omit=dev` install
    // would have node_modules without the devDependencies build needs.
    const buildRoute = existsSync(join(dir, "node_modules", ".bin", "tsup"))
      ? `run \`npm run build\` in ${dir}, then re-run this command — it'll pick up ` +
        `the dist/ that build produces.`
      : `run \`npm install\` (the plain form — not \`--omit=dev\`, which skips the ` +
        `devDependencies the build needs) then \`npm run build\` in ${dir}, then re-run ` +
        `this command.`;
    // Only name the npx route when there's a package name to put in it.
    const orWithoutBuilding = pkg
      ? ` Or, without building: use the prebuilt npm package — \`npx ${pkg}@latest --help\` ` +
        `(runs the last published release, not your local edits); or run with Bun: ` +
        `\`bun ${join(dir, "cli.js")} --help\`.`
      : ` Or, without building, use Bun: \`bun ${join(dir, "cli.js")} --help\`.`;
    console.error(
      `Connector setup needed: this Node (v${process.versions.node}) can't run the ` +
        `connector's TypeScript source directly — that needs Node 22.18+, and there's no ` +
        `prebuilt dist/ here. Build one instead: ${buildRoute}${orWithoutBuilding}`,
    );
    process.exit(1);
  }
  // The source can run on this Node; now it just needs deps installed here.
  // This gate is the consumption route only (cli.js only ever runs the
  // connector, never builds/tests it) — --omit=dev, always. Building/testing
  // is a separate, deliberate workflow (`npm run build`/`npm test`) invoked
  // directly, not through cli.js.
  if (!existsSync(join(dir, "node_modules"))) {
    // Disambiguate the two sandbox failures that block an install, because the
    // fixes differ: a read-only connector dir (run unsandboxed / grant write)
    // vs. a blocked home dir (point the package cache inside this dir via
    // `--cache`). `dirWritable` probes with a real mkdir/rmdir, not the
    // permission bits, since a sandbox can deny the write at the syscall.
    const recommendation = dirWritable()
      ? `dependencies are not installed — run ` +
        `\`npm install --omit=dev --cache "${join(dir, ".npm-cache")}"\` in ${dir} ` +
        `(the workspace-local --cache survives a sandbox that blocks ~/.npm; plain ` +
        `\`npm install --omit=dev\` works otherwise).`
      : `dependencies are not installed and ${dir} is read-only in this sandbox ` +
        `(a test write failed) — \`npm install\` can't place node_modules here. ` +
        `Run the install with the sandbox disabled, or grant write access to ${dir} ` +
        `(a cache flag won't help — node_modules must land in this directory).`;
    // Re-run hint stays invocation-agnostic: cli.js is reachable via `node
    // cli.js`, `bun cli.js`, and `npx <pkg>@latest`, so don't name a runtime.
    console.error(
      `Connector setup needed: ${recommendation} ` +
        `Then re-run your command with \`--help\` to list the connector's scripts.`,
    );
    process.exit(1);
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
 * The connector's published package name, read from `package.json` — used to
 * point at the prebuilt npm package (`npx <name>@latest`) when this Node can't
 * run the TypeScript source. Returns null when it can't be read, so the caller
 * omits the npx suggestion rather than printing a vague one.
 */
function packageName() {
  try {
    const { name } = JSON.parse(
      readFileSync(join(dir, "package.json"), "utf8"),
    );
    return typeof name === "string" && name ? name : null;
  } catch {
    return null;
  }
}
