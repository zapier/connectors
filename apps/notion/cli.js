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
 * This file is byte-identical across all connectors and is managed by
 * connector-assets/. Do not edit per-connector copies directly; edit the
 * canonical source in connector-assets/ and run `pnpm run ensure-connector-assets`.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

if (process.argv[2] === "build") {
  if (!existsSync(join(dir, "dist", "cli.js"))) {
    for (const cmd of ["npx", "bunx"]) {
      const { status } = spawnSync(cmd, ["tsup"], {
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
