# @zapier/google-contacts-connector

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

- 73a4219: Set the Google Contacts connector to public npm access.

  Flip `publishConfig.access` from `"restricted"` to `"public"`, following the initial restricted-first publish in !218. This publishes the connector world-public on npm and adds it to the public GitHub mirror via `scripts/is-connector-public.mjs`. The already-published restricted `0.1.0` still needs a registry-side `npm access set status=public @zapier/google-contacts-connector` to be visible publicly.

## 0.1.0

### Minor Changes

- 36b0a4e: Initial release of `@zapier/google-contacts-connector`.
