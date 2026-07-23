# @zapier/clay-connector

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
