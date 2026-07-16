# Use as a recipe

For a harness that **writes its own code** against the Notion API directly — a code-execution sandbox with no pre-registered tools, no terminal/subprocess, and no way to `import` this package in-process. You can't run `cli.js`, load an MCP tool, or call the SDK's exported functions. What you _can_ do is write a snippet that makes HTTP calls. This page teaches you the request/response shapes this connector's 24 scripts use, so you can reproduce the same calls yourself.

You do not need this connector's code, its `{ data, meta }` output envelope, or its connection resolvers — none of that exists at the HTTP layer. You only need: a base URL, two headers, and per-endpoint request/response shapes.

## Auth, base URL, versioning

- Base URL: `https://api.notion.com/v1`.
- Every request needs two headers: `Authorization: Bearer <token>` and `Notion-Version: <version>`. For the auth-header mechanics and what counts as a valid token, see [notion-api-gotchas.md § Authentication and sharing](notion-api-gotchas.md#authentication-and-sharing). For which version this connector targets, what changed under it, and why omitting the header fails, see [notion-api-gotchas.md § Versioning and the data-sources model](notion-api-gotchas.md#versioning-and-the-data-sources-model-2025-09-03) — set the same value yourself on every call.
- Requests that send a body use `Content-Type: application/json` and a JSON-encoded body; `GET`/`DELETE` send no body.

## Operation-family shapes

These shapes are read directly off this connector's own request/response schemas — mechanism, not vendor-behavior claims, so no citation is attached. Field values shown (e.g. `"page"`, `"data_source"`) are literal discriminators from the connector's own schemas, not an exhaustive statement of every value the vendor API accepts — treat enum-like fields as illustrative and confirm actual valid values via `getDataSource` / the pointers below before depending on one.

### Search

```
POST /v1/search
body: {
  query?: string
  filter?: { property: "object", value: "page" | "data_source" }
  sort?: { direction?: "ascending" | "descending", timestamp?: "last_edited_time" }
  start_cursor?: string
  page_size?: number
}
-> {
  object: "list"
  results: object[]              // pages and/or data sources, each self-describing via its own `object` field
  next_cursor?: string | null
  has_more: boolean
}
```

Use this to resolve a title to an id before any get/query/write call.

### Pages

```
GET   /v1/pages/{page_id}
POST  /v1/pages
PATCH /v1/pages/{page_id}
GET   /v1/pages/{page_id}/markdown              // this connector's own Markdown rendering of the page body
GET   /v1/pages/{page_id}/properties/{property_id}
```

Page shape (`getPage`, `createPage`, `updatePage` all return this):

```
{
  object: "page"
  id: string
  url: string
  created_time?: string          // timestamp
  last_edited_time?: string
  in_trash?: boolean
  parent: {
    type?: "data_source_id" | "page_id" | "database_id" | "block_id" | "workspace"
    data_source_id?: string
    page_id?: string
    database_id?: string
    block_id?: string
  }
  properties?: Record<name, value>   // shape is per-property-type — see notion-properties.md
  icon?: object | null
  cover?: object | null
}
```

`POST /v1/pages` body: `{ parent: { data_source_id?: string } | { page_id?: string }, properties?: Record<name, value>, children?: Block[], icon?, cover? }` — provide exactly one of `data_source_id` or `page_id` in `parent`. `PATCH /v1/pages/{page_id}` body is the same shape minus the initial-`parent` requirement, plus `in_trash?: boolean`.

`GET /v1/pages/{page_id}/markdown` response: `{ markdown: string, truncated?: boolean, unknown_block_ids?: string[] }` — a convenience rendering, not a raw block dump.

`GET /v1/pages/{page_id}/properties/{property_id}` response is a paginated, type-tagged item: `{ object: "property_item" | "list", type?: string, next_cursor?: string | null, has_more?: boolean, ...type-specific fields }`.

### Databases and data sources

A database is a _container_; a data source underneath it carries the schema and rows.

```
GET   /v1/databases/{database_id}
POST  /v1/databases
PATCH /v1/databases/{database_id}
GET   /v1/data_sources/{data_source_id}
POST  /v1/data_sources
PATCH /v1/data_sources/{data_source_id}
POST  /v1/data_sources/{data_source_id}/query
```

Database shape:

```
{
  object: "database"
  id: string
  title?: RichText[]
  data_sources: { id?: string, name?: string }[]   // use one of these ids with getDataSource / query
  parent?: { type?, data_source_id?, page_id?, database_id?, block_id? }
  url?: string
  in_trash?: boolean
}
```

Data source shape:

```
{
  object: "data_source"
  id: string
  name?: string
  properties: Record<name, schemaValue>   // the row schema — see notion-properties.md
  parent?: { type?, data_source_id?, page_id?, database_id?, block_id? }
}
```

`POST /v1/databases` body: `{ parent: { page_id: string }, title?: RichText[], initial_data_source?: { properties: Record<name, schemaValue> }, icon? }`. `POST /v1/data_sources` body: `{ parent: { database_id: string }, title?: RichText[], properties: Record<name, schemaValue> }`. `PATCH` on either takes the subset of fields you're changing; `updateDataSource` accepts `properties` keyed by existing name, with a `null` value removing that property.

Query request/response:

```
POST /v1/data_sources/{data_source_id}/query
body: { filter?: object, sorts?: object[], start_cursor?: string, page_size?: number }
-> { object: "list", results: Page[], next_cursor?: string | null, has_more: boolean }
```

Filter/sort object shapes: see [notion-query.md](notion-query.md).

### Blocks

```
GET    /v1/blocks/{block_id}
GET    /v1/blocks/{block_id}/children
PATCH  /v1/blocks/{block_id}/children     // append
PATCH  /v1/blocks/{block_id}              // update content or in_trash
DELETE /v1/blocks/{block_id}              // trash
```

A page id works as a `block_id` everywhere here (a page is a block). The block object's own type-tagged shape: see [notion-blocks.md](notion-blocks.md). Envelope shapes:

```
GET .../children -> { object: "list", results: Block[], next_cursor?: string | null, has_more: boolean }
PATCH .../children  body: { children: Block[], after?: string } -> { object: "list", results: Block[], ... }
PATCH {block_id}    body: { <type-key>: {...}, in_trash?: boolean } -> Block
```

### Users

```
GET /v1/users
GET /v1/users/{user_id}
GET /v1/users/me          // identity of the current token
```

```
{
  object: "user"
  id: string
  type?: "person" | "bot"
  name?: string
  avatar_url?: string | null
  person?: { email?: string }   // present only with the right capability — see notion-api-gotchas.md
  bot?: object
}
```

`GET /v1/users` wraps this in the same `{ object: "list", results, next_cursor?, has_more }` list envelope as search/query.

### Comments

```
GET  /v1/comments?block_id={id}
POST /v1/comments
```

```
{
  object: "comment"
  id: string
  parent?: { type?, data_source_id?, page_id?, database_id?, block_id? }
  discussion_id: string        // pass back to reply to this thread
  created_time?: string
  created_by?: { id?: string, object?: string }
  rich_text?: RichText[]       // see notion-blocks.md
}
```

`POST /v1/comments` body: `{ parent: { page_id: string } }` **or** `{ discussion_id: string }` (exactly one, to start vs. reply to a thread) plus `rich_text: RichText[]`.

### Cross-workspace copy

`copyPage` isn't a single Notion endpoint — it's a small composed workflow across two separate bearer tokens (a source workspace and a target workspace), useful as a template for your own multi-step operations:

1. `GET /v1/pages/{source_page_id}` against the source token; pull the title out of whichever property has `type: "title"`.
2. `GET /v1/blocks/{source_page_id}/children` against the source token to get the top-level content blocks.
3. Strip response-only fields each block came back with (`id`, `object`, `created_time`, `last_edited_time`, `created_by`, `last_edited_by`, `has_children`, `parent`, `in_trash`, `archived`) — a block you _read_ is not directly valid as a block you _write_; only `type` plus that type's own key round-trip.
4. `POST /v1/pages` against the target token, with `parent: { type: "page_id", page_id: <target_parent_id> }`, `properties: { title: { title } }`, and the cleaned `children`.

If you need to write similar multi-step logic (read from one workspace, transform, write to another), this is the shape to follow: read with one token, strip non-writable fields, write with the other token.

## Block and rich-text structure

Every block is a typed object (`type` field + a same-named key holding its content), and most text-bearing blocks carry a `rich_text` array. Full model, the common block types, `has_children`/`in_trash` semantics, the `rich_text` fragment shape, `appendBlockChildren`'s limits and nesting rules, and why `updateBlock` can't change a block's type: see [notion-blocks.md](notion-blocks.md).

## Property value shapes

A data source's `properties` map is a **schema** (name → `{ type, ...config }`); a page's `properties` map holds **values** (name → a type-specific value object) — mixing the two up is the most common mistake. Per-type value shapes (title, rich_text, number, select, multi_select, date, relation, people, url, email, phone_number, …): see [notion-properties.md](notion-properties.md).

## Query and filter mechanism

`queryDataSource`'s `filter` is a single property condition or a compound `and`/`or` filter; `sorts` is an ordered array of property or timestamp sorts. Condition operators are specific to each property's type — read the schema via `getDataSource` first. Full filter/sort grammar and the result ceiling: see [notion-query.md](notion-query.md).

## Error-handling pattern

Mechanism (from the code): a call is either a success or it isn't — there's no separate transformation layer. Check the HTTP response status; on a non-2xx response, parse the JSON body as the error object and surface it. `copyPage`'s multi-step flow makes this explicit — after each of its three calls it checks the response and, on failure, raises an error that carries both a short description of which step failed and the response's own error payload.

Write the same pattern yourself: after each fetch, check `status`/`ok`; on failure, read the JSON body (it carries `code` and `message`), and raise/report an error that includes both your own context ("failed to read the source page") and the vendor's `code`/`message` so a caller can branch on `code` — e.g., back off and retry on `rate_limited`, or re-fetch the schema and retry on `validation_error`. The full status/code table and which codes are agent-fixable: see [notion-api-gotchas.md § Error envelope](notion-api-gotchas.md#error-envelope).

## Critical rules

Anything below is a claim about how the vendor API actually behaves, not this connector's code — each is a pointer, not a restatement:

- Versioning and the data-sources model (database vs. data source, why `Notion-Version` is required): [notion-api-gotchas.md#versioning-and-the-data-sources-model-2025-09-03](notion-api-gotchas.md#versioning-and-the-data-sources-model-2025-09-03)
- Auth and per-resource sharing (404 vs. "not shared"): [notion-api-gotchas.md#authentication-and-sharing](notion-api-gotchas.md#authentication-and-sharing)
- Error codes and what's agent-fixable: [notion-api-gotchas.md#error-envelope](notion-api-gotchas.md#error-envelope)
- Rate limits and backoff: [notion-api-gotchas.md#rate-limits](notion-api-gotchas.md#rate-limits)
- Payload/array/text/relation size limits: [notion-api-gotchas.md#size-limits](notion-api-gotchas.md#size-limits)
- Pagination cursors: [notion-api-gotchas.md#pagination](notion-api-gotchas.md#pagination)
- ID and URL formats: [notion-api-gotchas.md#id-and-url-formats](notion-api-gotchas.md#id-and-url-formats)
- Archive/trash semantics (`in_trash` vs. deprecated `archived`): [notion-api-gotchas.md#archive--trash-semantics](notion-api-gotchas.md#archive--trash-semantics)
- Search matches titles only: [notion-api-gotchas.md#search-matches-titles-only](notion-api-gotchas.md#search-matches-titles-only)
- 25-reference truncation on `getPage`: [notion-api-gotchas.md#property-values-truncate-at-25-references](notion-api-gotchas.md#property-values-truncate-at-25-references)
- Block object model and common types: [notion-blocks.md#a-block-is-a-typed-object](notion-blocks.md#a-block-is-a-typed-object), [notion-blocks.md#common-block-types](notion-blocks.md#common-block-types)
- `has_children` / `in_trash` block fields: [notion-blocks.md#block-fields](notion-blocks.md#block-fields)
- Rich text fragment shape: [notion-blocks.md#rich-text](notion-blocks.md#rich-text)
- Appending children (100-block limit, 2-level nesting): [notion-blocks.md#appending-children](notion-blocks.md#appending-children)
- Updating a block (type-locked, field-replace semantics): [notion-blocks.md#updating-a-block](notion-blocks.md#updating-a-block)
- Property schema object and the type list: [notion-properties.md#property-schema-object-data-source](notion-properties.md#property-schema-object-data-source)
- Page property value shapes per type: [notion-properties.md#page-property-values](notion-properties.md#page-property-values)
- Filter grammar (single + compound): [notion-query.md#filter](notion-query.md#filter), [notion-query.md#single-property-condition](notion-query.md#single-property-condition), [notion-query.md#compound-filters-and--or](notion-query.md#compound-filters-and--or)
- Sort grammar and precedence: [notion-query.md#sorts](notion-query.md#sorts)
- Query result ceiling: [notion-query.md#result-limits](notion-query.md#result-limits)

## Where to go next

| If you need to know about...                                                                   | Go to                                          |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Versioning, auth/sharing, errors, rate/size limits, pagination, ids, trash, search, truncation | [notion-api-gotchas.md](notion-api-gotchas.md) |
| The block object model, block types, rich text, appending/updating blocks                      | [notion-blocks.md](notion-blocks.md)           |
| Data-source schema definitions and per-type page property values                               | [notion-properties.md](notion-properties.md)   |
| `queryDataSource` filter and sort syntax                                                       | [notion-query.md](notion-query.md)             |
