#!/usr/bin/env node
// Connector CLI entry point.
// Managed by @zapier/connectors-dev — do not edit; synced byte-for-byte
// across every connector.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

// True inside the @zapier/connectors monorepo, where packages/* are built
// centrally so the app's own prepare must not build.
function isInConnectorsWorkspace() {
  let current = dir;
  for (;;) {
    const rootPkg = join(current, "package.json");
    if (
      existsSync(join(current, "pnpm-workspace.yaml")) &&
      existsSync(rootPkg)
    ) {
      try {
        if (
          JSON.parse(readFileSync(rootPkg, "utf8")).name ===
          "@zapier/connectors"
        ) {
          return true;
        }
      } catch {
        // unreadable root package.json — keep walking up
      }
    }
    const parent = dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

// `prepare` lifecycle hook: no-op in the monorepo; standalone, build dist/ via
// the connector's own `build` script (npm resolves the local tsup + its
// typescript peer). The `|| true` in the script value swallows a missing build.
if (process.argv[2] === "prepare") {
  if (!isInConnectorsWorkspace() && !existsSync(join(dir, "dist", "cli.js"))) {
    spawnSync("npm", ["run", "build"], {
      stdio: "inherit",
      shell: true,
      cwd: dir,
    });
  }
  process.exit(0);
}

// Run the target as a subprocess (not import()) so import.meta.main is true and
// the dispatcher executes.
const target = existsSync(join(dir, "dist", "cli.js"))
  ? join(dir, "dist", "cli.js")
  : join(dir, "cli.ts");

const { status } = spawnSync(
  process.execPath,
  [target, ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(status ?? 1);
