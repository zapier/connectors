#!/usr/bin/env node
/**
 * Connector CLI entry point.
 *
 * When dist/cli.js is present (npm install route, or after a local build):
 *   → delegates to the compiled CLI, works on any Node version.
 *
 * When dist/ is absent (git-clone route, no build step):
 *   → handles the `prepare` subcommand directly (any Node version, no TS
 *     needed), then falls through to cli.ts for all other subcommands
 *     (requires Node 22.18+ or Bun for TypeScript stripping outside
 *     node_modules).
 *
 * `prepare` subcommand: the connector's `prepare` lifecycle hook. It compiles
 *   the connector so that `import { search } from "@zapier/notion-connector"`
 *   works on any Node version even when the connector was installed from a
 *   git/file source.
 *   - Inside the @zapier/connectors monorepo it is a no-op: packages/* are
 *     built centrally by the root install, and rebuilding every app on a
 *     workspace install does not scale.
 *   - Standalone (a staged copy / `npx skills add`) it runs `tsup` via the
 *     local binary or `npx`, and exits 0 regardless so `npm install` never
 *     fails in restricted environments. The build is Node-only — Bun runs the
 *     `.ts` sources directly and needs no dist/.
 *
 * Managed by @zapier/connectors-dev — do not edit; synced byte-for-byte
 * across every connector.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

/**
 * True when this connector sits inside the @zapier/connectors pnpm workspace
 * (monorepo development). Walks up for a pnpm-workspace.yaml whose sibling
 * package.json is named "@zapier/connectors" — the same root detection
 * @pnpm/find-workspace-dir performs, inlined here because this file is
 * dependency-free and must run under npm/bun, where pnpm's npm_config_* env
 * vars are absent.
 */
function isInConnectorsWorkspace() {
  let current = dir;
  for (;;) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) {
      const rootPkg = join(current, "package.json");
      if (existsSync(rootPkg)) {
        try {
          if (
            JSON.parse(readFileSync(rootPkg, "utf8")).name ===
            "@zapier/connectors"
          ) {
            return true;
          }
        } catch {
          // Unreadable / invalid root package.json — keep walking up.
        }
      }
    }
    const parent = dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

if (process.argv[2] === "prepare") {
  // Inside the monorepo the root install builds packages/*; the app prepare
  // must not also build, or a workspace install rebuilds every connector.
  if (isInConnectorsWorkspace()) process.exit(0);

  if (!existsSync(join(dir, "dist", "cli.js"))) {
    // Prefer the locally-installed tsup binary so module resolution for
    // typescript (a required tsup peer) works from the connector's own
    // node_modules. Fall back to npx for environments without a local install
    // (e.g. a fresh git-clone before npm install).
    const localTsup = join(dir, "node_modules", ".bin", "tsup");
    const candidates = existsSync(localTsup)
      ? [
          [process.execPath, [localTsup]],
          ["npx", ["tsup"]],
        ]
      : [["npx", ["tsup"]]];
    for (const [cmd, args] of candidates) {
      const { status } = spawnSync(cmd, args, {
        stdio: "inherit",
        shell: true,
        cwd: dir,
      });
      if (status === 0) break;
    }
  }
  process.exit(0);
}

// Spawn the target as a subprocess so it runs as the entry point.
// Dynamic import() would set import.meta.main = false, causing
// runDispatchCli to return early without executing anything.
const target = existsSync(join(dir, "dist", "cli.js"))
  ? join(dir, "dist", "cli.js")
  : join(dir, "cli.ts");

const { status } = spawnSync(
  process.execPath,
  [target, ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(status ?? 1);
