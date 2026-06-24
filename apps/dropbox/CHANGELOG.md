# @zapier/dropbox-connector

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
