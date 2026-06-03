# @zapier/notion-connector

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
