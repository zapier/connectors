# @zapier/telegram-connector

## 0.2.5

### Patch Changes

- e391d17: Simplify the token-in-URL-path auth resolver. Use `zapierConnectionResolver` unwrapped with a `{{bot_token}}` placeholder baked into the `TELEGRAM_API` base URL; only the direct/env resolver swaps the placeholder for the real token. Drops the `injectBotPath` wrapper and the duplicated `TELEGRAM_API_PREFIX` constant. No behavioral change — verified live (getMe, getChat). Folds the corrected Pattern 7 factory guidance into the connector.

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

## 0.1.4

### Patch Changes

- Updated dependencies [571624a]
  - @zapier/connectors-sdk@0.2.0

## 0.1.3

### Patch Changes

- 84e91fe: Restore the Telegram connector to public npm access.

  Per STAFF-4355, Telegram was cleared by Legal (Benjamin Freshman, 2026-06-23: "Clear with conditions" — Telegram's API terms have no partner-approval gate; only data-use and trademark conditions apply, which don't block publishing the client package). Flip `publishConfig.access` back from `"restricted"` to `"public"`, reversing the precautionary hold from !208. This also re-adds Telegram to the public GitHub mirror via `scripts/is-connector-public.mjs`. Pipedrive stays restricted (still held pending partner approval).

## 0.1.2

### Patch Changes

- 6fa76ba: Restrict the Pipedrive and Telegram connectors to non-public npm access.

  Per STAFF-4355, these connectors should not be world-public on npm. Switch
  their `publishConfig.access` from `"public"` to `"restricted"` (matching the
  `@zapier/slack-connector` precedent from STAFF-4104), which also drops them
  from the public GitHub mirror via `scripts/is-connector-public.mjs`. The
  already-published public `0.1.1` versions still need a registry-side
  `npm access set status=private` (or unpublish) to be fully withdrawn.

## 0.1.1

### Patch Changes

- 9371fb5: Trim two no-signal columns from the connector `SKILL.md` Scripts table (and the scaffold template). `Default export` and `Tool name` collapse into a single `Tool name` column now that STAFF-4005 makes the script filename stem, tool `name`, `defineConnector` key, and default export the same camelCase token. `Has dependent fields?` is dropped since `inputDependencies` was removed from the SDK in STAFF-3966 (and was `No` on every row anyway). New shape: `| Script | Tool name | Connections | Description |`.

## 0.1.0

- Initial version.
