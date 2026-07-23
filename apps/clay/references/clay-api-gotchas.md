# Clay API — gotchas

This connector talks to Clay's **internal table API at `https://api.clay.com/v3`** — the
same surface Clay's own app uses to read and write tables, records, workspaces, and
users. Everything below about request/response shape, auth, and endpoints is derived
from **this connector's own shipped code** (`connections.ts`, `scripts/*.ts`), which is
public-by-construction (it ships to npm + the GitHub mirror). Treat that code as the
source of truth.

> **The `/v3` surface is not publicly documented.** Clay's published docs
> (university.clay.com, developers.clay.com) describe a _different_ surface — the in-table
> **HTTP-API / webhook enrichment actions** and a `/v1/people` Enterprise enrichment API
> that uses `Authorization: Bearer …`. Those docs do **not** describe the `/v3/tables/*`
> CRUD endpoints this connector calls, and their auth header, endpoints, response shapes,
> and pagination do **not** transfer. Because `/v3` is undocumented, vendor-side
> specifics — rate limits, error-body schema, per-endpoint quotas, retry/backoff rules,
> exact response envelopes beyond what the code unwraps — are **unverified**. Do not
> assume them from the public developer API. When a call fails, surface the raw upstream
> status and body rather than inferring a documented error contract that does not exist
> for this surface.

## Authentication — raw `authorization` header, no scheme

The API key is sent as the **raw value** of the `authorization` header — **no `Bearer`
prefix, no scheme** (see `connections.ts`):

```
authorization: <your Clay API key>
```

This is the single most common thing to get wrong, because Clay's _public_ `/v1`
enrichment API documents `Authorization: Bearer <key>`. For the `/v3` surface this
connector uses, a `Bearer ` prefix will fail auth. Get the key from Clay under
**Settings → Account → API keys**.

Identity is resolved from the key itself — `getCurrentUser` (`GET /v3/`) returns the
caller under `auth.actor.userId` and `auth.email`. A failure there means the key is
invalid; it is the cheapest way to check the connection.

## The resource hierarchy: user → workspace → table → view/record

The `/v3` endpoints are keyed by ids you have to resolve in order — there is no
"list everything" shortcut. The connector's tools walk this chain:

1. `getCurrentUser` / `listWorkspaces` — `GET /v3/` gives the caller's `userId`, then
   `GET /v3/users/{userId}/workspaces` lists workspaces. `userId` is **not** an input;
   it is always resolved from the key first.
2. `listTables` — `GET /v3/workspaces/{workspaceId}/tables`.
3. `getTable` — `GET /v3/tables/{tableId}`, returning the table's `fields` and `views`.
   The response is wrapped in a top-level `table` object; the connector unwraps `.table`.
4. `listRecords` — `GET /v3/tables/{tableId}/views/{viewId}/records`. Records are read
   **through a view**, not off the table directly, so you need a `viewId` from
   `getTable` (`views[].id`).

## Field ids and cell shape (the write contract)

Records are keyed by **field id** (`f_...`), not by column name. Get field ids from
`getTable` (`fields[].id`). When writing cells (`createRecord`, `updateRecord`), the
value shape depends on the field's `type`:

- **Scalar fields** (text, email, url, number, date) take a plain value.
- **`select`** fields take `{ optionIds: [id] }` — option ids come from `getTable`
  (`fields[].options`).
- **`users`** fields take `{ userIds: [id] }` — user ids come from `listWorkspaceUsers`.
- **`boolean`** fields take a plain boolean.

The field `type` values the connector recognizes are: `text`, `email`, `url`, `number`,
`boolean`, `date`, `select`, `users`, `image`, `formula`, and `action`. (`formula` and
`action` are computed/enrichment columns — you generally read them, not write them.)

## Finding rows: the `/find` filter DSL

`findRecord` does **not** take a flat map on the wire. The connector fetches the table
schema first (`GET /v3/tables/{tableId}`) to resolve each field's `type`, then translates
your `{ fieldId: value }` map into Clay's nested filter DSL:

```json
{
  "filter": {
    "type": "AND",
    "operands": [
      {
        "fieldId": "f_...",
        "type": "FIELD",
        "filterConfig": {
          "type": "OPERATOR",
          "operator": "EQUAL",
          "value": "..."
        }
      }
    ]
  }
}
```

posted to `POST /v3/tables/{tableId}/find`. All conditions are **AND-combined**. The
operator is chosen from the field type: `EQUAL` for scalars, `SELECT_EQUAL` for `select`,
`USER_EQUAL` for `users`, `CHECKED`/`NOT_CHECKED` for `boolean` (value dropped), and
`NOT_EMPTY`/`EMPTY` for `image` (value dropped). This type→operator mapping is the
connector's own logic against the undocumented surface — if Clay changes an operator
name, the filter would silently match nothing rather than error.

## Pagination: limit-only, no cursor

`listRecords` supports **only a `limit` query param** (rows per page); the connector
defaults it to `20` when omitted. There is **no cursor/offset/page token** in the request
or the tool surface. `findRecord` likewise passes only `limit`. Do not expect
cursor-based pagination the way Clay's public developer API describes — that is a
different surface. To page beyond `limit`, there is no supported continuation token here.

## Writes and Clay credits (product behavior)

Adding a row to a table can trigger the table's enrichment columns, and enrichments
**consume Clay credits**. Clay's docs state that
["Auto-update allows Clay to enrich any new rows added to your table automatically"](https://university.clay.com/docs/clay-credit-conservation)
and that
["Each record enriched or exported counts as 1 Action—regardless of data source or provider"](https://university.clay.com/docs/actions-data-credits),
so `createRecord` (and imports generally) can incur credit usage without any further
call. This is Clay **product** behavior documented independent of the `/v3` API surface.
Be deliberate about creating rows in tables that have live enrichment columns.

## Request/response mechanics

- **`createRecord`** wraps a single row in a batch envelope on the wire —
  `POST /v3/tables/{tableId}/records` with body `{ "records": [ { "cells": {...} } ] }` —
  and the response comes back under `records`; the connector unwraps `records[0]`.
- **`updateRecord`** sends the cells map **directly** (no envelope) —
  `PATCH /v3/tables/{tableId}/records/{recordId}` with the cells object as the body. Only
  the cell keys you include are changed.
- The connector treats a non-OK HTTP status as a thrown error (`throwIfNotOk`). Since the
  error body schema for `/v3` is undocumented, surface the raw status/body to the caller
  rather than parsing a specific error shape.

## Summary of what does NOT apply here

If you find Clay API docs online, check which surface they describe before trusting them:

- `Authorization: Bearer …` and `clay-api-key` headers → the public/enterprise `/v1`
  enrichment API, **not** this `/v3` table surface (which uses a raw `authorization`
  header).
- `/v1/people/enrich`, `/v1/people`, `/tables/query`, cursor pagination, a `/me`
  returning `{ user, workspace }` → all the public developer API, not `/v3`.
- The `/v3` table/record/workspace endpoints this connector uses have **no public API
  reference**; the shapes here come from the connector's own code.
