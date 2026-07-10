# @zapier/microsoft-sharepoint-connector

## 0.1.2

### Patch Changes

- a7fe391: **@zapier/microsoft-sharepoint-connector**: package.json: scripts.prepack — missing or incorrect; package.json: devDependencies["tsup"] is redundant — the workspace root already provides it (^8.5.1); connectors resolve build tooling via ancestor node_modules/.bin, not their own copy; package.json: devDependencies["typescript"] is redundant — the workspace root already provides it (^5.6.0); connectors resolve build tooling via ancestor node_modules/.bin, not their own copy
- a7fe391: Automated dependency update from Renovate.

  @zapier/connectors-sdk: ^0.4.0 → ^0.4.1

## 0.1.1

### Patch Changes

- 18e568b: Remove the broken `prepare` lifecycle script. It ran `node cli.js build`, but `cli.js` is the connector dispatch CLI with no `build` command, so it dumped the script list and errored on every `npm install` / CI pipeline; the `bun` fallback failed too (no bun in CI) and `|| true` only masked it. Building is already handled by `build` (`tsup`) and the workspace-wide build.

## 0.1.0

### Minor Changes

- 707fa6b: Initial release of `@zapier/microsoft-sharepoint-connector`.
