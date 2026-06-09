# @zapier/notion-connector

## 0.1.0-experimental.7

### Patch Changes

- 6cea662: Bump `@zapier/connectors-sdk` dependency to `0.1.0-experimental.12`.

## 0.1.0-experimental.6

### Patch Changes

- a463948: Fix connector CLI dispatch regression on Node 22.18+

  Add an esbuild plugin to the `cli.ts` tsup entry that externalises
  `./index.ts → ./index.js`, preventing scripts from being inlined into
  `dist/cli.js`. Without this, every script's top-level
  `await handleIfScriptMain(import.meta, …)` fired when the dispatch CLI
  started (because `import.meta.main` is `true` for the bundle entry in
  Node 22.18+), causing all scripts to execute instead of routing via
  `runDispatchCli`.

## 0.1.0-experimental.5

### Patch Changes

- af02524: Ship compiled JS for the npm install route; add `prepare` build for git-clone library imports.

  `@zapier/notion-connector`: adds a tsup build that emits `dist/index.js` and `dist/cli.js`. The `exports` field now points at the compiled library (`dist/index.js`), fixing `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` on all Node versions when the connector is imported as a node module. A plain-JS proxy (`cli.js`) is the new `bin` entry — it runs `dist/cli.js` when present (npm install, any Node) or falls through to source `cli.ts` (git-clone route, Node 22.18+/Bun, no build required). A `prepare` lifecycle hook (`node cli.js build`) auto-builds `dist/` on git-clone installs so that `import { search } from "@zapier/notion-connector"` works even when the package was installed from a git/file source. The `build` subcommand is handled directly in `cli.js` (no TS loading needed) and exits 0 on failure so installs never break in restricted environments.

  `@zapier/connectors-ref`: updates the connector contract to require `exports` → `{ import: "./dist/index.js", types: "./index.ts" }` and `bin` → `./cli.js`. Rejects raw `.ts` entry points. Adds `dist/` and `cli.js` to required `files`.

## 0.1.0-experimental.4

### Patch Changes

- d5b6ee9: Bump `@zapier/connectors-sdk` dependency to `0.1.0-experimental.10`.

## 0.1.0-experimental.3

### Patch Changes

- 0e3316d: Rename script files and tool names to camelCase to comply with the new connector naming convention enforced by `@zapier/connectors-sdk` and `@zapier/connectors-ref`.
  - `scripts/copy-page.ts` → `scripts/copyPage.ts`, `name: "copy_page"` → `"copyPage"`
  - `scripts/create-database-item.ts` → `scripts/createDatabaseItem.ts`, `name: "create_database_item"` → `"createDatabaseItem"`

- Updated dependencies [342f3d8]
  - @zapier/connectors-sdk@0.1.0-experimental.9

## 0.1.0-experimental.2

### Patch Changes

- 872c151: Remove `inputDependencies` from `defineTool` and all `ToolDefinition` types.

  The `inputDependencies` field and `TInputDependencies` generic parameter have been stripped from `DefineToolConfig*`, `ToolDefinitionBase`, and `AnyToolDefinition`. The corresponding `_meta["zapier:inputDependencies"]` emission has been removed from `toMcpTool` and `toMcpServerTool`. The feature will be redesigned and reintroduced once the dependent-field API shape has been finalised.

- Updated dependencies [872c151]
  - @zapier/connectors-sdk@0.1.0-experimental.8

## 0.1.0-experimental.1

### Patch Changes

- 002076a: Bump `@zapier/connectors-sdk` dependency to `^0.1.0-experimental.7`.

  The version published on npm (`0.1.0-experimental.0`) still references
  `@zapier/connectors-sdk@0.1.0-experimental.3`. This patch re-publishes the
  connector so installers get the up-to-date SDK range.
