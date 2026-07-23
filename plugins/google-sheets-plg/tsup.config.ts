/**
 * tsup build config for connectors.
 *
 * Compiles index.ts (library entry, bundled) and cli.ts (CLI, bundled but
 * with the connector's index module kept external).
 *
 * The cli.ts entry externalises ./index.ts → ./index.js via an esbuild plugin
 * so that dist/cli.js imports the pre-built dist/index.js as a separate module
 * rather than inlining scripts. Without this, each script's top-level
 * `await handleIfScriptMain(import.meta, …)` ends up inside the single-file
 * bundle; in Node 22.18+ import.meta.main is true for the bundle entry,
 * causing every script to execute when the dispatch CLI starts instead of
 * routing via runDispatchCli.
 *
 * Managed by @zapier/connectors-dev — do not edit; synced byte-for-byte
 * across every connector.
 */
import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["index.ts"],
    format: ["esm"],
    dts: false,
    clean: true,
    target: "es2022",
    external: [
      "@modelcontextprotocol/sdk",
      "@zapier/zapier-sdk",
      "zod",
      "@zapier/connectors-sdk",
    ],
  },
  {
    entry: ["cli.ts"],
    format: ["esm"],
    dts: false,
    clean: false,
    target: "es2022",
    external: [
      "@modelcontextprotocol/sdk",
      "@zapier/zapier-sdk",
      "zod",
      "@zapier/connectors-sdk",
    ],
    esbuildPlugins: [
      {
        name: "externalize-connector-index",
        setup(build) {
          // Resolve ./index.ts to the pre-built ./index.js and mark it external
          // so scripts are not inlined into dist/cli.js. When dist/index.js is
          // imported (not the entry), import.meta.main is false inside it and
          // handleIfScriptMain's existing !meta.main guard suppresses per-script
          // execution — no SDK changes required.
          build.onResolve({ filter: /^\.\/index(\.ts)?$/ }, () => ({
            path: "./index.js",
            external: true,
          }));
        },
      },
    ],
  },
]);
