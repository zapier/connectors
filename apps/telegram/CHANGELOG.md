# @zapier/telegram-connector

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
