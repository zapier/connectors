# @zapier/google-contacts-connector

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
