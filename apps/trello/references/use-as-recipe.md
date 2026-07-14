# Using Trello without this package — write-your-own-code shape

This is the shape for a harness that can't load pre-registered tools, can't run a
terminal or subprocess, and can't `import` this npm package in-process — for example,
a code-execution sandbox that only writes and runs its own snippets. There is no
connector code to call here. Use this page to write equivalent code directly against
the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/)
(`https://api.trello.com/1`), patterned on how this connector's own 44 scripts call it.

## Auth & base URL

Base URL: `https://api.trello.com/1`. Every request needs an API key and a token.
The simplest way to hand-write this is to send them as `key` and `token` query
parameters on every call (and/or as form fields on POST/PUT bodies) — Trello
documents this as a valid alternate path alongside header-based auth; see
[Auth & tokens](trello-api-gotchas.md#auth--tokens) for the full mechanics, what the
key vs. the token each grant, and how the API responds to a bad or revoked token.

```
GET https://api.trello.com/1/<path>?key=<apiKey>&token=<token>&<other params>
POST/PUT https://api.trello.com/1/<path>?key=<apiKey>&token=<token>   (body: form-encoded or JSON fields)
```

Don't hardcode or log the token — treat it like any other secret your sandbox handles.

## Request/response shapes by operation family

All ids below are 24-character hex strings (Trello object ids) — see
[Object IDs](trello-api-gotchas.md#object-ids). Shapes are structural (field name +
type); treat any enum, limit, or id shown here as a placeholder, not a real value.

**Boards** — `boards/*`, `members/me/boards`, `search?modelTypes=boards`

- Read one: `GET /boards/{id}` → `{ id, name, desc?, closed?, idOrganization?, url?, shortUrl?, dateLastActivity? }`
- List mine: `GET /members/me/boards?filter=<state-enum>` → array of the same board shape
- Find by name: `GET /search?query=<text>&modelTypes=boards` → `{ boards: [...same shape] }`
- Create: `POST /boards` with body `{ name, desc?, idOrganization?, defaultLists?<bool> }`
- Close/reopen: `PUT /boards/{id}` with body `{ closed: <bool> }`
- Copy: `POST /boards` with body `{ idBoardSource: <id>, name?, idOrganization?, keepFromSource?<comma-list> }`
- Members: `GET /boards/{id}/members` → array of member shape (see Members below);
  `POST /boards/{id}/memberships` with body `{ email | idMember, type?<enum>, fullName? }`

**Lists** — `lists/*`, `boards/{id}/lists`

- Read one: `GET /lists/{id}` → `{ id, name, closed?, idBoard, pos? }`
- List on a board / find by name: `GET /boards/{id}/lists` → array of the same shape
- Create: `POST /lists` with body `{ name, idBoard, pos?<"top"|"bottom"|number> }`

**Cards** — `cards/*`, `boards/{id}/cards`, `search?modelTypes=cards`

- Read one: `GET /cards/{id}` → `{ id, idShort?, name, desc?, idBoard, idList, shortUrl?, url, due?, start?, closed, idMembers?, idLabels?, labels?<array of {id,name?,color?}>, dateLastActivity?, customFields?<record> }`
- List on a board (paginated): `GET /boards/{id}/cards?filter=<state-enum>&before=<cardId>&limit=<n>` — `before` is a cursor (a card id); loop with the last returned card's id until a page comes back short
- Search: `GET /search?query=<Trello query DSL>&modelTypes=cards&idBoards=<id>` → `{ cards: [...same shape] }` — see [Search](trello-api-gotchas.md#search) for the query DSL and its special rate-limit tier
- Create: `POST /cards` with body `{ idList, name, desc?, pos?, due?, start?, idLabels?<comma-joined ids>, address?, coordinates?, locationName? }` — id required per [Cards, lists, and boards](trello-api-gotchas.md#cards-lists-and-boards); members/attachments/checklist/custom-fields are separate follow-up calls (see below), not part of the create body
- Update: `PUT /cards/{id}` with any subset of the create fields plus `{ descOverwrite?<bool>, dueComplete?, closed?, idList?, idBoard? }` — setting `idList`/`idBoard` is how a "move" is expressed; setting `closed: true` is how an "archive" is expressed, there's no separate delete verb
- Add member: `POST /cards/{id}/idMembers` with body `{ value: <memberId> }`
- Add label: `POST /cards/{id}/idLabels` with body `{ value: <labelId> }`; remove: `DELETE /cards/{id}/idLabels/{labelId}`

**Comments & actions** — `cards/{id}/actions/comments`, `actions/{id}`

- Add a comment: `POST /cards/{id}/actions/comments` with body `{ text }` → returns an action: `{ id, type, date, data?: { text?, card?: { id?, name? } } }`
- Read an action later: `GET /actions/{id}` → same action shape

**Attachments** — `cards/{id}/attachments`

- List: `GET /cards/{id}/attachments` → array of `{ id, name, url?, mimeType?, bytes?, isUpload? }`
- Add a URL/link attachment: `POST /cards/{id}/attachments` form body `{ url, name?, mimeType? }`
- Add a remote file: fetch the remote URL yourself first, then `POST /cards/{id}/attachments` as `multipart/form-data` with a `file` part (plus `name`) — there is no local-disk upload path from a sandbox with no filesystem/binary access anyway

**Labels** — `labels/*`, `boards/{id}/labels`

- Read one: `GET /labels/{id}` → `{ id, idBoard, name?, color? }`
- List on a board / find by name: `GET /boards/{id}/labels` → array of the same shape
- Create: `POST /labels` with body `{ name?, color?<fixed color-name enum>, idBoard }`

**Checklists** — `checklists/*`, `cards/{id}/checkItem/{itemId}`

- Read one: `GET /checklists/{id}` → `{ id, name, idCard? }`
- Create: `POST /checklists` with body `{ idCard, name }`
- Delete: `DELETE /checklists/{id}`
- Add an item: `POST /checklists/{id}/checkItems` with body `{ name, pos? }` → `{ id, name, state?<two-value enum>, idChecklist? }`
- Toggle an item: `PUT /cards/{id}/checkItem/{itemId}` with body `{ state?<two-value enum> }`

**Members & organizations** — `members/*`, `organizations/*`, `search/members`

- Current identity: `GET /members/me` → `{ id, username, fullName?, initials?, avatarUrl?, email? }` — `email` is present only under the auth conditions in [Auth & tokens](trello-api-gotchas.md#auth--tokens)
- Read one: `GET /members/{id}` → same shape
- Find members: `GET /search/members/?query=<text>&idOrganization=<id>` → array of the same shape (a distinct endpoint from card/board search — see [Search](trello-api-gotchas.md#search))
- Workspace: `GET /organizations/{id}` → `{ id, name, displayName, url? }`; list mine similarly under a members/me nested path

**Custom fields** — `boards/{id}/customFields`, `cards/{id}/customField/{fieldId}/item`

- Definitions: `GET /boards/{id}/customFields` → array of `{ id, name, type<fixed field-type enum>, options?<array, present for choice-style field types> }`
- Set a value: `PUT /cards/{id}/customField/{fieldId}/item` with JSON body `{ value: <shape depends on the field's type — e.g. a boolean-as-string for checkbox, a date string for date, a numeric string for number, an option id for list, else plain text> }` — resolve the field's `type` first so you send the right value shape

## Error handling

Treat any non-2xx response as a failure. Read the body before deciding how to
interpret it — Trello error bodies aren't uniformly shaped: sometimes it's a short
plain-text message, sometimes structured JSON. Two statuses are worth branching on
explicitly because they're actionable: 404 usually means the id doesn't exist or
your token can't see it (double-check the id and access); 401 means the auth
credentials are missing, malformed, or revoked (see
[Auth & tokens](trello-api-gotchas.md#auth--tokens) for the exact revoked-token
behavior). 429 has its own documented envelope — see
[Rate limits](trello-api-gotchas.md#rate-limits) before you write retry logic.
Whatever you do with the body, surface the HTTP status alongside it rather than
discarding it.

## Critical rules

These are vendor-behavior facts, not mechanism — each one is a pointer into this
connector's own published gotchas doc rather than restated here:

- Auth model, key vs. token secrecy, and revoked-token behavior: [Auth & tokens](trello-api-gotchas.md#auth--tokens)
- Trello id format and why you must resolve an id via a list/find/search call before writing (never guess one): [Object IDs](trello-api-gotchas.md#object-ids)
- Request budgets, the extra `/members/` limit, and the `x-rate-limit-*` headers: [Rate limits](trello-api-gotchas.md#rate-limits)
- Search query requirements and why it's rate-limited more strictly than nested reads: [Search](trello-api-gotchas.md#search)
- Preferring nested routes over per-object GETs, before-cursor paging, and the too-many-cards failure mode: [Nested resources & pagination](trello-api-gotchas.md#nested-resources--pagination)
- Card-create's required field, archive-vs-delete semantics, and comments being actions: [Cards, lists, and boards](trello-api-gotchas.md#cards-lists-and-boards)
- Form vs. JSON bodies on writes, and the URL-only nature of attachments: [Writes & attachments](trello-api-gotchas.md#writes--attachments)
- What this API surface deliberately doesn't cover: [Out of scope](trello-api-gotchas.md#out-of-scope-say-so-dont-fake-it)

## Where to go next

- [Auth & tokens](trello-api-gotchas.md#auth--tokens)
- [Object IDs](trello-api-gotchas.md#object-ids)
- [Rate limits](trello-api-gotchas.md#rate-limits)
- [Search](trello-api-gotchas.md#search)
- [Nested resources & pagination](trello-api-gotchas.md#nested-resources--pagination)
- [Cards, lists, and boards](trello-api-gotchas.md#cards-lists-and-boards)
- [Writes & attachments](trello-api-gotchas.md#writes--attachments)
- [Out of scope](trello-api-gotchas.md#out-of-scope-say-so-dont-fake-it)
