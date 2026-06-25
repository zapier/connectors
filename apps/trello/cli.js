#!/usr/bin/env node
/**
 * Connector CLI entry point.
 *
 * When dist/cli.js is present (npm install route, or after a local build):
 *   → delegates to the compiled CLI, works on any Node version.
 *
 * When dist/ is absent (git-clone route, no build step):
 *   → handles the `build` subcommand directly (any Node version, no TS needed),
 *     then falls through to cli.ts for all other subcommands (requires Node 22.18+
 *     or Bun for TypeScript stripping outside node_modules).
 *
 * `build` subcommand: compiles the connector so that
 *   `import { search } from "@zapier/notion-connector"` works on any Node version
 *   even when the connector was installed from a git/file source. Invoked
 *   automatically by the `prepare` lifecycle hook on git-clone installs.
 *   Tries `npx tsup`, falls back to `bunx tsup`, exits 0 regardless so that
 *   `npm install` / `pnpm install` never fails in restricted environments.
 *
 * Managed by @zapier/connectors-dev — do not edit; synced byte-for-byte
 * across every connector.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

if (process.argv[2] === "build") {
  if (!existsSync(join(dir, "dist", "cli.js"))) {
    // Try the locally-installed tsup binary first so module resolution for
    // typescript (a required tsup peer) works from the connector's own
    // node_modules. Fall back to npx/bunx for environments without a local
    // install (e.g. fresh git-clone before npm install).
    const localTsup = join(dir, "node_modules", ".bin", "tsup");
    const candidates = existsSync(localTsup)
      ? [
          [process.execPath, [localTsup]],
          ["npx", ["tsup"]],
          ["bunx", ["tsup"]],
        ]
      : [
          ["npx", ["tsup"]],
          ["bunx", ["tsup"]],
        ];
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
