# Using Microsoft OneDrive without tools, terminal, or imports

This is the write-your-own-code path: no pre-registered tools, no terminal/subprocess access, and no way to `import` this package in-process (for example, a code-execution sandbox that only runs snippets you author). If any of those are actually available instead, use [`references/use-as-mcp.md`](use-as-mcp.md), [`references/use-as-cli.md`](use-as-cli.md), or [`references/use-as-sdk.md`](use-as-sdk.md) — this file is only for when none of them are.

Everything here is Microsoft Graph v1.0. Base URL: `https://graph.microsoft.com/v1.0`. Address the caller's own OneDrive at `/me/drive`, or a specific drive at `/drives/{driveId}`; items are `…/items/{itemId}` (or path-addressed `…/root:/{path}:`). Send your own authed request — `Authorization: Bearer <token>` — on each call (see [`use-without-zapier.md`](use-without-zapier.md) for how to obtain the token). The vendor's behavioral rules referenced below live in [`microsoft-onedrive-api-gotchas.md`](microsoft-onedrive-api-gotchas.md) — read it before implementing; this file only shows request/response _shape_.

## Reading: get, list, search

- **Get an item** — `GET {driveBase}/items/{itemId}`. Returns a `driveItem`: `{ id, name, webUrl?, size?, folder?, file?, parentReference?, remoteItem?, createdDateTime?, lastModifiedDateTime?, "@microsoft.graph.downloadUrl"? }`.
- **List a folder's children** — `GET {driveBase}/items/{itemId}/children` (or `/root/children` for the drive root). Paged: the body is `{ value: [...], "@odata.nextLink"?: string }` — the connector reshapes that to `{ items, next_cursor }`, where `next_cursor` is the opaque `@odata.nextLink`. To page, GET that URL **verbatim**.
- **List drives** — `GET /me/drives` (or `/drives/{driveId}` for one). Returns `drive` objects: `{ id, name?, driveType?, webUrl?, owner?, quota? }`.
- **Search within a drive** — `GET {driveBase}/root/search(q='{text}')`, same list envelope.
- **Search owned + shared (KQL)** — `POST /search/query` with `{ requests: [{ entityTypes: ["driveItem"], query: { queryString }, from, size }] }`. Paged by numeric `from` offset, not a cursor.
- **Resolve a sharing URL** — encode the URL to a share token (`u!` + base64url, `=` stripped, `/`→`_`, `+`→`-`) and `GET /shares/{token}/driveItem`.

## Writing: folders, moves, deletes, copies

- **Create a folder** — `POST {driveBase}/items/{parentId}/children` with `{ name, folder: {}, "@microsoft.graph.conflictBehavior": "rename"|"replace"|"fail" }`. Returns the new `driveItem`.
- **Move / rename** — `PATCH {driveBase}/items/{itemId}` with `{ parentReference: { id: newParentId }, name? }`. Returns the updated `driveItem`.
- **Delete** — `DELETE {driveBase}/items/{itemId}` → `204 No Content` (the connector synthesizes `{ success: true }`).
- **Copy** — `POST {driveBase}/items/{itemId}/copy` with `{ parentReference, name?, "@microsoft.graph.conflictBehavior"? }` → `202 Accepted` with a monitor URL in the `Location` header. Poll that URL (no auth) for `{ status, percentageComplete, resourceId? }` until `completed`/`failed`. See the gotchas' async-copy section.

## Files: upload, replace, download, export

- **Upload text / small content** — `PUT {driveBase}/items/{parentId}:/{name}:/content?@microsoft.graph.conflictBehavior=…` with the raw body. Returns the `driveItem`.
- **Upload / replace larger binary** — open a resumable session (`POST …:/{name}:/createUploadSession` for new, or `…/items/{itemId}/createUploadSession` to replace) with `{ item: { "@microsoft.graph.conflictBehavior" } }`, then `PUT` byte-ranges to the session's `uploadUrl`. The session-`PUT` rules (fragment size, no `Authorization` header, zero-byte handling) are load-bearing — see the gotchas' uploads section.
- **Download** — read `@microsoft.graph.downloadUrl` off the item (or `GET …/items/{itemId}/content`, a `302` to that URL) and fetch it directly with **no** auth header; it expires in minutes.
- **Export/convert** — `GET …/items/{itemId}/content?format={pdf|jpg|…}` → `302` to a short-lived URL. `format=jpg` additionally needs `width`+`height`. See the gotchas' export section.

## Sharing: links, invites, permissions

- **Create link** — `POST {driveBase}/items/{itemId}/createLink` with `{ type: "view"|"edit"|"embed", scope?: "anonymous"|"organization"|"users" }`. Returns a `permission` with a `link` facet (`{ type, scope, webUrl }`).
- **Invite** — `POST {driveBase}/items/{itemId}/invite` with `{ recipients: [{ email }], roles: ["read"|"write"], requireSignIn, sendInvitation, message? }`. Graph returns a `value` array of `permission`s (one per recipient), which the connector reshapes to `{ items }`; a partial failure comes back as `207` Multi-Status.
- **List permissions** — `GET {driveBase}/items/{itemId}/permissions` → list envelope of `permission`s (`{ id, roles?, link?, grantedToV2?, grantedToIdentitiesV2?, shareId?, expirationDateTime? }`).
- **Remove permission** — `DELETE {driveBase}/items/{itemId}/permissions/{permId}` → `204`. See the gotchas on inherited-permission restrictions.

## Errors

Graph returns errors as `{ error: { code, message, innerError? } }` with a meaningful HTTP status. Branch on the HTTP status (and `error.code`), never on `message` prose. For which statuses mean what — and the ones you must handle specially (`403` unconsented scope, `404` stale id, `429`/`503` with `Retry-After`, `507` over-quota, `409` name conflict) — see [`microsoft-onedrive-api-gotchas.md`](microsoft-onedrive-api-gotchas.md); don't re-derive them here.

## Critical rules a from-scratch caller gets wrong

All detailed in the [gotchas reference](microsoft-onedrive-api-gotchas.md) — pointers, not restatements:

- Pre-authenticated URLs (download, export, upload-session `PUT`) take **no** `Authorization` header, and download/export URLs expire within minutes.
- Copy is asynchronous — you get a monitor URL, not the finished item; failures surface there.
- Pagination cursors (`@odata.nextLink`) are opaque — follow them verbatim; KQL search pages by offset instead.
- The default `@microsoft.graph.conflictBehavior` on Graph is `fail`; this connector's tools default to `rename`.
- Reaching shared or other-drive content requires the `Files.ReadWrite.All` scope, and such items surface via the `remoteItem` facet.
