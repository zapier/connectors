/**
 * tsup build config for connectors.
 *
 * Compiles index.ts (library entry, with declarations) and cli.ts (CLI, bundled
 * for use by the cli.js proxy on the npm install route).
 *
 * This file is byte-identical across all connectors. Edit the canonical source
 * in the assets/ directory of @zapier/connectors-dev and run
 * `connectors-dev ensure-assets` to sync all copies.
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
  },
]);
