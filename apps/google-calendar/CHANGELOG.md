# @zapier/google-calendar-connector

## 0.1.1

### Patch Changes

- 9371fb5: Trim two no-signal columns from the connector `SKILL.md` Scripts table (and the scaffold template). `Default export` and `Tool name` collapse into a single `Tool name` column now that STAFF-4005 makes the script filename stem, tool `name`, `defineConnector` key, and default export the same camelCase token. `Has dependent fields?` is dropped since `inputDependencies` was removed from the SDK in STAFF-3966 (and was `No` on every row anyway). New shape: `| Script | Tool name | Connections | Description |`.

## 0.1.0

- Initial version.
