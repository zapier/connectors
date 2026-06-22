# Trello API — gotchas & durable knowledge

Per-app behavior the agent needs to call Trello's REST API correctly. Every claim
here is sourced from [Trello's public developer documentation](https://developer.atlassian.com/cloud/trello/).
Mechanical details (auth wiring, Zod shapes, connector helpers) live in code, not here.

## Auth & tokens

- **OAuth 1.0a via `Authorization` header.** Trello accepts
  `Authorization: OAuth oauth_consumer_key="{{apiKey}}", oauth_token="{{apiToken}}"`
  ([Authorization guide](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/)).
  Query `key=` / `token=` parameters and PUT/POST body fields are alternate paths; this connector uses the header.
- **The API key is public; the token is secret.** "[An API key by itself doesn't grant access to a user's Trello data](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/)"
  but tokens grant full account access and "[should be kept secret](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/)."
- **Revoked or invalid tokens return 401.** When a token has been revoked, the API responds with HTTP 401 and
  `invalid token`; integrations should prompt re-authorization
  ([Authorization guide](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/)).
- **Member email requires `account` scope.** "[Member emails can only be accessed when the `account` scope is requested](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/)."

## Object IDs

- **Trello ids are 24-character MongoDB ObjectIds** (hex). They appear on boards, lists, cards, members, labels, etc.
  Search and list responses use the same shape (e.g. `"id": "5abbe4b7ddc1b351ef961414"` in the
  [Search API reference](https://developer.atlassian.com/cloud/trello/rest/api-group-search/)).
- **Resolve ids before writes.** List/find tools return candidate arrays; the agent must pick the correct id — the API does not auto-select a single match for you.

## Rate limits

- **300 requests per 10 seconds per API key; 100 per 10 seconds per token.**
  ([Rate limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/))
- **429 responses name the limit.** Token exhaustion returns `{ "error": "API_TOKEN_LIMIT_EXCEEDED", ... }`;
  key exhaustion returns `{ "error": "API_KEY_LIMIT_EXCEEDED", ... }`
  ([Rate limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/)).
- **`/1/members/` has an extra limit: 100 requests per 900 seconds** (anti-enumeration)
  ([Rate limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/)).
- **Search and member search are "special routes"** with stricter limits — use nested resources when possible
  (e.g. `/1/boards/:id/members` instead of hammering `/1/members`)
  ([Rate limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/)).
- **Honor `x-rate-limit-*` response headers** to stay within limits
  ([Rate limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/)).

## Search

- **`GET /1/search` requires a `query` string** and accepts `modelTypes` to restrict results to boards, cards, members, etc.
  ([Search API](https://developer.atlassian.com/cloud/trello/rest/api-group-search/)).
- **Use search sparingly** — it counts against special-route limits; prefer list/find on a known board when the scope is narrow.
- **Member search is a separate endpoint:** `GET /1/search/members/` with `query`, optional `idBoard` / `idOrganization`
  ([Search API](https://developer.atlassian.com/cloud/trello/rest/api-group-search/)).

## Nested resources & pagination

- **Prefer nested routes over many single-object GETs.** Example: all cards on a board via
  `GET /1/boards/{boardId}/cards` instead of iterating individual card ids
  ([Nested resources](https://developer.atlassian.com/cloud/trello/guides/rest-api/nested-resources/),
  [Rate limits — Working With Rate Limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/)).
- **Card list endpoints support cursor-style paging** via `before` (card id) and `limit` — return one page and loop explicitly; do not assume full-board hydration in one call.
- **Large action loads can fail.** Requesting all board cards with `actions=all` may hit
  `API_TOO_MANY_CARDS_REQUESTED`; fetch actions in follow-up calls
  ([Rate limits — Response Size Limits](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/)).

## Cards, lists, and boards

- **Creating a card requires `idList`.** `POST /1/cards` takes `idList` (and optional name, desc, due, etc.)
  ([Cards API](https://developer.atlassian.com/cloud/trello/rest/api-group-cards/)).
- **`closed: true` archives a card or board** (soft-close). There is no hard-delete tool in this connector; reopen with `closed: false` via update tools.
- **Moving a card changes `idList` (and optionally `idBoard`).** Resolve the destination list id via `listLists` or `findList` before calling move/update.
- **Comments are actions.** Adding a comment creates a `commentCard` action on the card; `getAction` retrieves it by action id.

## Writes & attachments

- **POST/PUT bodies may use JSON or form fields.** The authorization guide shows JSON bodies with embedded `key`/`token`;
  many Trello write endpoints also accept standard form fields. Prefer `application/x-www-form-urlencoded` for writes when the API accepts it.
- **URL attachments vs file upload.** This connector's `addCardAttachment` accepts a URL or remote file URL — not local binary upload. Multipart upload is out of scope.

## Connector output shape

- **List/find tools return `{ items: [...] }`.** The SDK requires object-shaped outputs; array results are wrapped — read `.items`, not the raw top-level array.

## Out of scope (say so, don't fake it)

- Webhooks, Butler automations, Power-Ups admin, enterprise governance APIs, and batch/plugin-only surfaces are not exposed by this connector.
