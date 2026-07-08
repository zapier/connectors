# @zapier/microsoft-sharepoint-connector

## 0.1.1

### Patch Changes

- 18e568b: Remove the broken `prepare` lifecycle script. It ran `node cli.js build`, but `cli.js` is the connector dispatch CLI with no `build` command, so it dumped the script list and errored on every `npm install` / CI pipeline; the `bun` fallback failed too (no bun in CI) and `|| true` only masked it. Building is already handled by `build` (`tsup`) and the workspace-wide build.

## 0.1.0

### Minor Changes

- 707fa6b: Initial release of `@zapier/microsoft-sharepoint-connector`.
