# @zapier/microsoft-sharepoint-connector

## 0.1.5

### Patch Changes

- ad2c85f: Synced with the updated Zapier platform tooling and policy (`connectors-dev validate --fix`):

  - `SKILL.md`
  - `cli.js`
  - `package.json`
  - `references/use-as-cli.md`

- ad2c85f: Automated dependency update from Renovate.

  - File changes as a result of (external) dependency updates.

## 0.1.4

### Patch Changes

- de4ad4a: Add references/use-as-recipe.md — a reference implementation for harnesses that write their own code against the Microsoft Graph API (can't load tools, run a terminal, or import this package in-process).

## 0.1.3

### Patch Changes

- 642096f: Bump `@zapier/connectors-sdk` dependency to `0.4.3`.

  Migrate `SKILL.md` to the new interface-agnostic router introduced in `@zapier/connectors-dev@0.11.0` (STAFF-4533): `## Setup` now dispatches to per-shape `references/use-as-{cli,mcp,sdk}.md`, `## Running scripts` is retired in favor of those files, and `## Auth` / `## Output format` are trimmed to the shape-agnostic conceptual model. `README.md` reconciled to match.

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
