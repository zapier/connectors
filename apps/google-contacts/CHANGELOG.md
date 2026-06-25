# @zapier/google-contacts-connector

## 0.1.1

### Patch Changes

- 73a4219: Set the Google Contacts connector to public npm access.

  Flip `publishConfig.access` from `"restricted"` to `"public"`, following the initial restricted-first publish in !218. This publishes the connector world-public on npm and adds it to the public GitHub mirror via `scripts/is-connector-public.mjs`. The already-published restricted `0.1.0` still needs a registry-side `npm access set status=public @zapier/google-contacts-connector` to be visible publicly.

## 0.1.0

### Minor Changes

- 36b0a4e: Initial release of `@zapier/google-contacts-connector`.
