# @zapier/dropbox-connector

## 0.2.0

### Minor Changes

- a63b649: Drop explicit Bun support and the standalone on-install build; require Node.js 22.18+ for the source-run (skill) route.

  The dependency route is unaffected — published tarballs ship a precompiled `dist/`, so connectors consumed as a dependency still run on any Node. For the source-run route, `preflight.sh` is removed: its readiness diagnostics (missing `node_modules`, sandbox writability, unsupported Node for type-stripping) now live in the `cli.js` entry point, which bails with an actionable `Connector setup needed:` recommendation. Per-connector `tsup`/`typescript` devDependencies and the `prepare` script are gone — the publish build runs at the monorepo root.

### Patch Changes

- Updated dependencies [d884cf4]
  - @zapier/connectors-sdk@0.2.2

## 0.1.1

### Patch Changes

- 571624a: Make full-response error capture the reusable default (STAFF-4287).
  - **connectors-sdk**: export the response-capture primitives `readResponseBody` and `toConnectorHttpResponse`, and refactor `fromResponseBody` / `throwIfNotOk` onto them, so a connector that subclasses `ConnectorHttpError` for app-specific hints captures the upstream Response (status, headers, body) exactly as the shared path does instead of re-deriving it.
  - **dropbox-connector**: `DropboxApiError` reduces to a thin subclass that reuses those primitives (no longer copies header-flattening or body-reading).
  - **google-ads connector**: migrate the error path off a hand-rolled `throw new Error` onto `ConnectorHttpError`, so a non-ok response surfaces its status/headers/body on `error.response` (and in `toString()`) instead of collapsing to a string. Also fixes a latent read-body-twice bug on the google-ads error path.

- Updated dependencies [571624a]
  - @zapier/connectors-sdk@0.2.0

## 0.1.0

### Minor Changes

- 79f7ee5: Initial release of `@zapier/dropbox-connector`.
