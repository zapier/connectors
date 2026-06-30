# @zapier/notion-connector

## 0.2.0

### Minor Changes

- a63b649: Drop explicit Bun support and the standalone on-install build; require Node.js 22.18+ for the source-run (skill) route.

  The dependency route is unaffected — published tarballs ship a precompiled `dist/`, so connectors consumed as a dependency still run on any Node. For the source-run route, `preflight.sh` is removed: its readiness diagnostics (missing `node_modules`, sandbox writability, unsupported Node for type-stripping) now live in the `cli.js` entry point, which bails with an actionable `Connector setup needed:` recommendation. Per-connector `tsup`/`typescript` devDependencies and the `prepare` script are gone — the publish build runs at the monorepo root.

### Patch Changes

- Updated dependencies [d884cf4]
  - @zapier/connectors-sdk@0.2.2

## 0.1.2

### Patch Changes

- Updated dependencies [571624a]
  - @zapier/connectors-sdk@0.2.0

## 0.1.1

### Patch Changes

- 9371fb5: Trim two no-signal columns from the connector `SKILL.md` Scripts table (and the scaffold template). `Default export` and `Tool name` collapse into a single `Tool name` column now that STAFF-4005 makes the script filename stem, tool `name`, `defineConnector` key, and default export the same camelCase token. `Has dependent fields?` is dropped since `inputDependencies` was removed from the SDK in STAFF-3966 (and was `No` on every row anyway). New shape: `| Script | Tool name | Connections | Description |`.

## 0.1.0

- Initial version.
