# Notion API — durable per-app knowledge

Patterns and quirks worth knowing when calling Notion's REST API from an agent. Content distilled from real-world usage; agents that hit a new edge case in flight should append to this file.

## ID formats

All Notion IDs are UUIDv4 strings — `3c90c3cc-0d44-4b50-8888-8dd25736052a`. Notion accepts UUIDs with or without dashes; both work.

**Extracting an ID from a URL.** Notion URLs end with the page or database title followed by the ID without dashes:

```
https://www.notion.so/Page-Title-3c90c3cc0d444b508888dd25736052a
                                 └─────────── 32 hex chars ──────┘
```

Insert dashes at positions 8-12-16-20 to convert to the canonical UUID form:

```ts
function extractNotionId(urlOrId: string): string {
  if (/^[a-f0-9-]{32,36}$/i.test(urlOrId)) return urlOrId;
  const match = urlOrId.match(/([a-f0-9]{32})(?:[?#]|$)/i);
  if (!match) return urlOrId;
  const raw = match[1];
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}
```

## Parent shapes

Every page and database has a parent. The shape varies by parent type:

| Parent type | JSON shape                                        | Use when                                    |
| ----------- | ------------------------------------------------- | ------------------------------------------- |
| Page        | `{ "type": "page_id", "page_id": "..." }`         | Creating a sub-page under a page            |
| Database    | `{ "type": "database_id", "database_id": "..." }` | Creating a row in a database                |
| Workspace   | `{ "type": "workspace", "workspace": true }`      | Root-level pages (public integrations only) |

## Property values by type

The `properties` object in `create_database_item` (and in update calls) uses Notion's property-value shapes. The accepted shape per type is fixed; the property _names_ depend on the database's schema (see `inputDependencies`).

| Property type | Value shape                                              |
| ------------- | -------------------------------------------------------- |
| Title         | `{ title: [{ text: { content: "string" }}] }`            |
| Rich text     | `{ rich_text: [{ text: { content: "string" }}] }`        |
| Number        | `{ number: 42 }`                                         |
| Select        | `{ select: { name: "Option A" }}`                        |
| Multi-select  | `{ multi_select: [{ name: "Tag1" }, { name: "Tag2" }] }` |
| Date          | `{ date: { start: "2026-01-15" }}`                       |
| Checkbox      | `{ checkbox: true }`                                     |
| URL           | `{ url: "https://example.com" }`                         |
| Email         | `{ email: "user@example.com" }`                          |
| Relation      | `{ relation: [{ id: "page_id_1" }] }`                    |

## Pagination

All Notion list endpoints use cursor-based pagination via `next_cursor` / `start_cursor`. Default `page_size` is 100 (also the max). Loop until `has_more` is false:

```ts
let startCursor: string | undefined;
let hasMore = true;
const all: unknown[] = [];

while (hasMore) {
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify({
      ...body,
      page_size: 100,
      start_cursor: startCursor,
    }),
  });
  const data = await res.json();
  all.push(...data.results);
  hasMore = data.has_more;
  startCursor = data.next_cursor ?? undefined;
}
```

For GET endpoints (e.g. `/blocks/:id/children`), pass cursor as a query param instead.

## Database sharing — the silent failure mode

**If a database doesn't appear in search or option lookups, it's almost always because the database hasn't been shared with the integration.** Notion's permission model defaults to "internal integration sees nothing"; the user has to explicitly share each database (or its parent page) with the integration before it becomes visible.

When this happens, search returns `{ results: [] }` and there's no error message. The fix is human-mediated: ask the user to open the database in Notion → `Share` → `Add connections` → select the integration.

## Error shape

Notion uses standard HTTP status codes (NOT the Slack-style "200 with `ok: false`"). Errors return a JSON body with `code` and `message`:

```json
{
  "object": "error",
  "status": 400,
  "code": "validation_error",
  "message": "body failed validation: body.properties.Status.select should be defined, instead was `null`."
}
```

Status codes used: `400` validation, `401` auth, `403` permission, `404` not found, `409` conflict, `429` rate-limited (with `Retry-After` header), `500+` server errors.

## API version pinning

The `Notion-Version` header is required on every request. The `buildDirectFetch` in this skill pins `2022-06-28` — the stable version with the longest deprecation window. Newer versions exist (e.g. `2025-09-03` adds the data-source concept) but introduce breaking changes around databases / data sources. Pin per script, bump deliberately.

## Rate limits

~3 requests/second per integration. The `Retry-After` header on 429 responses gives the wait time. Plan retries with jitter.
