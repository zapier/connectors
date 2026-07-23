# Clay — reference implementation (recipe)

**When to use this.** For a harness that must **write its own code** against the Clay API
because it can't load the packaged tools, run the CLI, or import the package in-process
(e.g. a sandboxed `execute_snippet` surface with its own authed HTTP path). If the tools
are already callable, use [`use-as-mcp.md`](./use-as-mcp.md); if you have a terminal, use
[`use-as-cli.md`](./use-as-cli.md); if you can import the package, use
[`use-as-sdk.md`](./use-as-sdk.md). This file teaches the request/response **logic** to
re-implement, not how to invoke the scripts.

This connector calls Clay's **internal `https://api.clay.com/v3` table API**. That surface
is **undocumented publicly** — the shapes below come from the connector's own code, and
vendor-side error/limit specifics are unverified. See
[`clay-api-gotchas.md`](./clay-api-gotchas.md) for the full picture, especially the auth
and "what does NOT apply" sections.

## Auth

Send the Clay API key as the **raw value** of the `authorization` header — **no `Bearer`
prefix, no scheme**:

```
authorization: <your Clay API key>
```

Express this as your harness's own authed request (e.g. `ctx.zapier.fetch`) that sets that
header. Do **not** use `Authorization: Bearer` — that is Clay's _public_ `/v1` API, a
different surface. See [`clay-api-gotchas.md`](./clay-api-gotchas.md#authentication--raw-authorization-header-no-scheme).

## Base path and resource walk

All paths are under `https://api.clay.com/v3`. Ids resolve in a chain — there is no
list-everything endpoint:

```
GET  /v3/                                     -> { auth: { actor: { userId }, email } }
GET  /v3/users/{userId}/workspaces            -> { workspaces: [ { id, name } ] }
GET  /v3/workspaces/{workspaceId}/tables      -> { tables: [ { id, name } ] }
GET  /v3/workspaces/{workspaceId}/users       -> { users: [ { id, name, email } ] }
GET  /v3/tables/{tableId}                     -> { table: { fields: [...], views: [...] } }
```

- **Identity** (`getCurrentUser`): `GET /v3/`, then read `auth.actor.userId` and
  `auth.email`. A failure means the key is invalid.
- **Workspaces** (`listWorkspaces`): resolve `userId` from `GET /v3/` first (it is not an
  input), then `GET /v3/users/{userId}/workspaces`.
- **Tables** (`listTables`): `GET /v3/workspaces/{workspaceId}/tables`.
- **Table schema** (`getTable`): `GET /v3/tables/{tableId}`, then unwrap the top-level
  `table` object. Gives `fields` (`{ id, name, type, options }`) and `views`
  (`{ id, name }`). Field `type` is one of: `text`, `email`, `url`, `number`, `boolean`,
  `date`, `select`, `users`, `image`, `formula`, `action`.

## Read records

```
GET /v3/tables/{tableId}/views/{viewId}/records?limit={n}
```

Records are read **through a view** (`viewId` from `getTable` → `views[].id`), not off the
table. `limit` is the only paging control (default to `20` if unset); there is **no
cursor**. Response holds the matching rows (`{ id, cells }` per row). See
[`clay-api-gotchas.md`](./clay-api-gotchas.md#pagination-limit-only-no-cursor).

## Create a record

Wrap a single row in a batch envelope; unwrap `records[0]` from the response:

```
POST /v3/tables/{tableId}/records
body: { "records": [ { "cells": { "<fieldId>": <value>, ... } } ] }
-> { "records": [ { "id", "cells" } ] }   // use records[0]
```

Cells are keyed by **field id** (`f_...` from `getTable`). Value shape by field type:
scalars take a plain value; `select` takes `{ optionIds: [id] }`; `users` takes
`{ userIds: [id] }` (ids from `GET /v3/workspaces/{workspaceId}/users`).

> Creating rows can trigger enrichment columns that **consume Clay credits** — see
> [`clay-api-gotchas.md`](./clay-api-gotchas.md#writes-and-clay-credits-product-behavior).

## Update a record

The PATCH body is the cells map sent **directly** — no envelope. Only included keys change:

```
PATCH /v3/tables/{tableId}/records/{recordId}
body: { "<fieldId>": <value>, ... }
```

## Find records (filter DSL)

`/find` takes a nested filter DSL, not a flat map. Fetch the table schema first to learn
each field's `type`, then build one operand per condition and AND-combine:

```
POST /v3/tables/{tableId}/find?limit={n}
body: {
  "filter": {
    "type": "AND",
    "operands": [
      { "fieldId": "<f_...>", "type": "FIELD",
        "filterConfig": { "type": "OPERATOR", "operator": "<OP>", "value": <value> } }
    ]
  }
}
```

Choose `<OP>` from the field type: `EQUAL` (scalars), `SELECT_EQUAL` (`select`),
`USER_EQUAL` (`users`), `CHECKED`/`NOT_CHECKED` (`boolean`, drop `value`),
`NOT_EMPTY`/`EMPTY` (`image`, drop `value`). All operands are AND-combined; `limit` is the
only paging control. See
[`clay-api-gotchas.md`](./clay-api-gotchas.md#finding-rows-the-find-filter-dsl).

## Error handling

Treat any non-2xx HTTP status as a failure and **surface the raw upstream status and
body** — the `/v3` error-body schema is undocumented, so do not parse a specific error
shape or assume documented error codes. See the note in
[`clay-api-gotchas.md`](./clay-api-gotchas.md).
