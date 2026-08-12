# @zapier/clay-connector

## 0.0.5

### Patch Changes

- 1e274f3: Synced with the updated Zapier platform tooling and policy (`connectors-dev validate --fix`):

  - `README.md`
  - `references/use-as-cli.md`

- 1e274f3: Synced with the updated Zapier platform tooling and policy (`connectors-dev validate --fix`):

  - `README.md`
  - `references/use-as-cli.md`

- 1e274f3: Automated dependency update from Renovate.

  - `@zapier/connectors-sdk`: ^0.4.5 → ^0.4.6
  - File changes as a result of (external) dependency updates.

## 0.0.4

### Patch Changes

- 58e2e06: Synced with the updated Zapier platform tooling and policy (`connectors-dev validate --fix`):

  - `README.md`
  - `SKILL.md`
  - `references/use-without-zapier.md`

- 58e2e06: Automated dependency update from Renovate.

  - File changes as a result of (external) dependency updates.

## 0.0.3

### Patch Changes

- 3515715: Automated dependency update from Renovate.

  - `@zapier/connectors-sdk`: ^0.4.3 → ^0.4.5

## 0.0.2

### Patch Changes

- 85552c6: Fix `getTable` to surface select-field options. Clay returns a select field's options nested under `typeSettings.dataTypeSettings.options`, which output validation dropped — so callers never saw a select field's choices (needed to build `optionIds` cells). They are now mapped onto the documented `fields[].options`. Also strengthens the skill's row-disambiguation guidance: re-run `findRecord` at update time rather than reusing a `recordId` remembered from earlier in the conversation, so newly-added duplicates aren't missed.

## 0.0.1

### Patch Changes

- 40d399e: Add the Clay connector — agent-callable tools for Clay tables: create/update/find rows, list a view's rows, and navigate workspaces, tables, views, and members. Authenticates with a Clay API key (raw `authorization` header).
- 40d399e: Fix two output-schema mismatches found in live testing against `api.clay.com/v3`:

  - `listWorkspaceUsers`: Clay returns `users[].id` as a number, but the schema
    typed it as a string, so output validation threw. Coerce it to a string
    (consistent with `getCurrentUser`'s string `userId`).
  - `updateRecord`: Clay's update endpoint returns only an acknowledgement
    (`{ message: "Record updates enqueued" }`), not the record, so the previous
    `{ id, cells }` output schema threw. Model the ack and echo `recordId`; the
    update is applied asynchronously (re-read with `findRecord`/`listRecords` to
    confirm).

- 40d399e: Synced with the updated Zapier platform tooling and policy (`connectors-dev validate --fix`):

  - `package.json`
  - `references/use-as-cli.md`
  - `references/use-as-mcp.md`
  - `references/use-as-sdk.md`
  - `references/use-with-zapier.md`
  - `references/use-without-zapier.md`
