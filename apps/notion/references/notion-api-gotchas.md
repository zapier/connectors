# Notion API gotchas

Cross-cutting behavior of the public Notion API (`https://api.notion.com/v1`) that affects most tools. Read this before debugging an error or a surprising result.

## Versioning and the data-sources model (2025-09-03)

Every request must carry a `Notion-Version` header. This connector pins it to `2025-09-03`; omitting it returns a `missing_version` error. To use the 2025-09-03 model you set [`Notion-Version: "2025-09-03"`](https://developers.notion.com/docs/upgrade-guide-2025-09-03).

Under this version, **a database is a container of one or more data sources**: "[A database is a parent of one or more data sources, each of which parents zero or more pages.](https://developers.notion.com/reference/data-source)" The **data source** — not the database — carries the property schema and the rows (pages). The [Retrieve a data source API](https://developers.notion.com/docs/upgrade-guide-2025-09-03) "is the new home for getting up-to-date information on the properties (schema) of each data source under a database."

Practical consequences:

- **Creating a row and querying rows target a `data_source_id`, not a database id.** Per the [upgrade guide](https://developers.notion.com/docs/upgrade-guide-2025-09-03), create-page now uses `"parent": {"type": "data_source_id", "data_source_id": "..."}`, and the query endpoint is `POST /v1/data_sources/:data_source_id/query`.
- Get a `data_source_id` from `getDatabase` (`data_sources[].id`) or from `search` (filter on `data_source`). A database id is the **container** — it does not query directly.
- The schema (property names, types, select options) lives on the data source: read it with `getDataSource` before `createPage` / `queryDataSource`.

## Authentication and sharing

Auth is a single bearer token: "[Requests use the HTTP `Authorization` header to both authenticate and authorize operations.](https://developers.notion.com/reference/authentication)" (`Authorization: Bearer <token>`.)

An integration **only sees content explicitly shared with it.** A resource can exist and still be invisible to the token if it hasn't been shared — that surfaces as a 404: "[Returns a 404 HTTP response if the page doesn't exist, or if the connection doesn't have access to the page.](https://developers.notion.com/reference/retrieve-a-page)" So treat `object_not_found` on a known-valid id as "not shared with this integration," not necessarily "deleted."

## Error envelope

Non-2xx responses carry a JSON error body. Per the [status codes reference](https://developers.notion.com/reference/status-codes), error responses contain `code` and `message` properties (with an optional `additional_data` object). The HTTP status carries the failure; the `code` tells you what to do.

| HTTP | `code`                  | Meaning ([source](https://developers.notion.com/reference/status-codes)) |
| ---- | ----------------------- | ------------------------------------------------------------------------ |
| 400  | `invalid_json`          | The request body could not be decoded as JSON.                           |
| 400  | `invalid_request_url`   | The request URL is not valid.                                            |
| 400  | `invalid_request`       | This request is not supported.                                           |
| 400  | `validation_error`      | Request body does not match the schema for expected parameters.          |
| 400  | `missing_version`       | The request is missing the required `Notion-Version` header.             |
| 401  | `unauthorized`          | The bearer token is not valid.                                           |
| 403  | `restricted_resource`   | Client doesn't have permission to perform this operation.                |
| 404  | `object_not_found`      | Resource does not exist or hasn't been shared with token owner.          |
| 409  | `conflict_error`        | Transaction could not be completed, potentially due to data collision.   |
| 429  | `rate_limited`          | Request exceeds number of requests allowed.                              |
| 500  | `internal_server_error` | An unexpected error occurred.                                            |
| 502  | `bad_gateway`           | Notion encountered an issue completing the request.                      |
| 503  | `service_unavailable`   | Notion is unavailable (response timeout >60 seconds).                    |
| 504  | `gateway_timeout`       | Notion timed out while attempting to complete request.                   |
| 529  | `service_overload`      | Notion is temporarily overloaded.                                        |

Most agent-fixable errors are `validation_error` (wrong body shape — re-check the schema via `getDataSource`) and `object_not_found` (wrong id, or not shared).

## Rate limits

"[The rate limit for incoming requests per connection is an average of three requests per second.](https://developers.notion.com/reference/request-limits)" Over the limit, "[rate-limited requests return a `rate_limited` error code and an HTTP 429 response](https://developers.notion.com/reference/request-limits)." Back off and respect "[the Retry-After response header value, which is set as an integer number of seconds.](https://developers.notion.com/reference/request-limits)" Notion may also return `service_overload` / HTTP 529 when temporarily overloaded.

## Size limits

Per the [request limits reference](https://developers.notion.com/reference/request-limits):

- **Payload:** "payloads have a maximum size of 1000 block elements and 500KB overall."
- **Block arrays:** "Any array of all block types" is capped at 100 elements. (Note: appending children is further capped — see [notion-blocks.md](notion-blocks.md).)
- **Rich text:** `text.content` is limited to 2000 characters.
- **Relations / people:** 100 related pages / 100 users per value.

## Pagination

List endpoints (`search`, `queryDataSource`, `getBlockChildren`, `listUsers`, `listComments`, `getPageProperty`) paginate. Request params are `start_cursor` and `page_size`; response fields are `has_more` and `next_cursor`. Per the [intro reference](https://developers.notion.com/reference/intro), `page_size` has a **Maximum of 100**, `has_more` "indicates whether the response includes the end of the list," and `next_cursor` is "Only available when has_more is true." To page: send a request, read `next_cursor` when `has_more` is true, pass it back as `start_cursor`. Treat the cursor as opaque.

## ID and URL formats

"[Top-level resources are addressable by a UUIDv4 `id` property. You may omit dashes from the ID when making requests to the API, e.g. when copying the ID from a Notion URL.](https://developers.notion.com/reference/intro)" In practice the id appears as the trailing 32 hex characters of a Notion page/database URL (`notion.so/Title-<32hex>`). Tools accept an id with or without dashes, or a pasted URL — they normalize to the canonical dashed form before calling the API.

## Archive / trash semantics

Pages and blocks are trashed, not hard-deleted, via `in_trash`. "[To trash a page via the API, send an Update page request with the `in_trash` body param set to `true`. To restore a page from the trash, set `in_trash` to `false`.](https://developers.notion.com/reference/archive-a-page)" `updatePage` / `updateBlock` expose `in_trash`; `deleteBlock` trashes a block (a page is a block). The older `archived` field is deprecated in favor of `in_trash`.

## Search matches titles only

`search` is title-based and scoped to what's shared: "[Searches all parent or child pages and data_sources that have been shared with a connection](https://developers.notion.com/reference/post-search)" and returns those "[that have titles that include the `query` param](https://developers.notion.com/reference/post-search)." It does not search page body content. Omit `query` and "[the response contains all pages or data_sources that have been shared with the connection.](https://developers.notion.com/reference/post-search)" Use it to resolve a name to an id before a get/query/update.

## Property values truncate at 25 references

`getPage` truncates large multi-reference property values: "[Page properties are limited to up to 25 references per page property.](https://developers.notion.com/reference/retrieve-a-page)" For `relation`, `people`, `rich_text`, and `title` values that exceed 25, "[use the Retrieve a page property endpoint](https://developers.notion.com/reference/retrieve-a-page)" (`getPageProperty`), which paginates the full value.
