# @zapier/google-tasks-connector

## 0.2.12

### Patch Changes

- dd41f11: Synced with the updated Zapier platform tooling and policy (`connectors-dev validate --fix`):

  - `package.json`

## 0.2.11

### Patch Changes

- ad2c85f: Synced with the updated Zapier platform tooling and policy (`connectors-dev validate --fix`):

  - `SKILL.md`
  - `cli.js`
  - `package.json`
  - `references/use-as-cli.md`

- ad2c85f: Automated dependency update from Renovate.

  - File changes as a result of (external) dependency updates.

## 0.2.10

### Patch Changes

- 3616f38: Add references/use-as-recipe.md — a reference implementation for harnesses that write their own code against the Google Tasks API (can't load tools, run a terminal, or import this package in-process).

## 0.2.9

### Patch Changes

- 642096f: Bump `@zapier/connectors-sdk` dependency to `0.4.3`.

  Migrate `SKILL.md` to the new interface-agnostic router introduced in `@zapier/connectors-dev@0.11.0` (STAFF-4533): `## Setup` now dispatches to per-shape `references/use-as-{cli,mcp,sdk}.md`, `## Running scripts` is retired in favor of those files, and `## Auth` / `## Output format` are trimmed to the shape-agnostic conceptual model. `README.md` reconciled to match.

## 0.2.8

### Patch Changes

- a7fe391: **@zapier/google-tasks-connector**: package.json: scripts.prepack — missing or incorrect
- a7fe391: Automated dependency update from Renovate.

  @zapier/connectors-sdk: ^0.4.0 → ^0.4.1

## 0.2.7

### Patch Changes

- 57828a9: Raise the `@zapier/connectors-sdk` dependency floor to `^0.4.0`. The `0.4.0` release made `defineConnector({ meta })` required (breaking); the connectors already pass `meta`, but their declared range still excluded `0.4.0`, so the monorepo resolved them to the older published `0.3.1` and `typecheck` failed. Raising the range links the local `0.4.0` and unblocks the release.

## 0.2.6

### Patch Changes

- 388ff61: Attribute Zapier-proxied API calls to the connector that made them. Each connector's `package.json` `name`/`version` is now forwarded to the Zapier SDK as `callerPackage`, so requests through the connection proxy carry the `zapier-sdk-package` / `zapier-sdk-package-version` telemetry headers.

  `defineConnector` now requires `meta: import.meta` (**breaking**), which the generated `index.ts` passes. The connector's identity is a first-class input independent of whether it declares `connectionResolvers`, so it also feeds anonymous (non-Zapier) telemetry later. The identity is resolved lazily from the connector's own `package.json` and threaded through the connection resolvers to `createZapierSdk({ callerPackage })`, so it works across every consumption path — programmatic Node-module import, the connector bin, and the MCP server — not just the CLI.

- Updated dependencies [388ff61]
  - @zapier/connectors-sdk@0.4.0

## 0.2.5

### Patch Changes

- c2748bb: Require `@zapier/zapier-sdk-cli` as the connector peer dependency instead of `@zapier/zapier-sdk`.

  The SDK still arrives at runtime — the CLI hard-depends on it, so it hoists to a single host-owned copy that also satisfies `@zapier/connectors-sdk`'s `@zapier/zapier-sdk` peer. Peering on the CLI means one `npm install` now lands both the runtime SDK and the `zapier-sdk` auth CLI, removing the second install step an agent previously hit when authenticating (`zapier-sdk login`, `list-connections`). Connector auth docs now use `npx zapier-sdk <cmd>`. STAFF-4508.

## 0.2.4

### Patch Changes

- Updated dependencies [7256e58]
  - @zapier/connectors-sdk@0.3.0

## 0.2.3

### Patch Changes

- 9708072: Bump `@zapier/connectors-sdk` dependency to `0.2.3`.

## 0.2.2

### Patch Changes

- d942c7c: Guide agents on older Node instead of letting them give up. `cli.js` now prints a self-contained fallback message when this Node can't run the TypeScript source: it leads with the implied Node 22.18+ upgrade, then offers run-without-upgrading options — the prebuilt npm package (`npx <name>@latest`, with its network/cache-write caveat) when a package name is readable, plus Bun. The `compatibility` frontmatter is softened from a flat "Requires Node.js 22.18+" floor to a non-gating string that points at `cli.js` for the real options, and the `SKILL.md` Setup + Running-scripts prose explains the older-Node path and the `node cli.js run` vs. `./scripts/<script>.ts` forms.

## 0.2.1

### Patch Changes

- 4859680: Fix regressions introduced by the canonical-template doc migration: drop leftover `<!-- TODO -->` markers that leaked into the live docs, restore each connector's real auth example (the connector's actual resolver and `<ENV_VAR>` / `<ENV_VAR_PREFIX>` placeholder, not the generic `env:<ENV_VAR>` template default), restore the app-specific `## Disambiguation & refusals` sections, and remove a duplicated legacy `## API quirks worth knowing` section that the canonical `## References` already covers.

## 0.2.0

### Minor Changes

- a63b649: Drop explicit Bun support and the standalone on-install build; require Node.js 22.18+ for the source-run (skill) route.

  The dependency route is unaffected — published tarballs ship a precompiled `dist/`, so connectors consumed as a dependency still run on any Node. For the source-run route, `preflight.sh` is removed: its readiness diagnostics (missing `node_modules`, sandbox writability, unsupported Node for type-stripping) now live in the `cli.js` entry point, which bails with an actionable `Connector setup needed:` recommendation. Per-connector `tsup`/`typescript` devDependencies and the `prepare` script are gone — the publish build runs at the monorepo root.

### Patch Changes

- Updated dependencies [d884cf4]
  - @zapier/connectors-sdk@0.2.2

## 0.1.1

### Patch Changes

- 54f299e: Publish `@zapier/google-tasks-connector` publicly (flip `publishConfig.access` to `public`), so it ships to the public npm registry and opts into the GitHub mirror alongside the other public connectors.

## 0.1.0

### Minor Changes

- 75eb579: Initial release of `@zapier/google-tasks-connector`.
