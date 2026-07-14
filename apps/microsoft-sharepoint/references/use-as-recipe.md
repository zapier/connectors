# Use as a recipe (write your own code)

For a harness that can't load pre-registered tools, can't run a terminal or
subprocess, and can't `import` this package in-process (for example, a
code-execution sandbox that only runs snippets you write on the spot). You
won't call this connector at all — you'll write HTTP calls straight to the
**Microsoft Graph v1.0** API and get Graph's raw JSON back, not this
package's tool envelope. This reference teaches the request/response shapes
this connector's own scripts use, so you can reproduce the same calls.

Everything below is **mechanism** — derived directly from this connector's
32 scripts (what URL, method, and body each one builds) — except the
"Critical rules" section, which is deliberately just pointers into
[microsoft-sharepoint-api-gotchas.md](microsoft-sharepoint-api-gotchas.md):
that's where the actual vendor-behavior claims (and their sources) live.
Don't restate those rules from memory; load the file and read the section.

## Auth

- Base URL: `https://graph.microsoft.com/v1.0`
- Every request needs a valid Microsoft Graph OAuth 2.0 access token,
  attached as `Authorization: Bearer <token>` — obtain that token however
  your environment already does Microsoft/Entra auth; that's outside this
  connector's scope.
- Which permission scope a token needs depends on the operation (read vs.
  write vs. list-management) — see
  [Auth & permission scopes](microsoft-sharepoint-api-gotchas.md#auth--permission-scopes).

## Request/response shape patterns

Ids compose: everything under a site is addressed
`/sites/{siteId}/...`; everything under a document library is addressed
`/sites/{siteId}/drive/...` (the site's default library) or
`/sites/{siteId}/drives/{driveId}/...` (a specific library) — see
[Sites & drives](microsoft-sharepoint-api-gotchas.md#sites--drives) for how
`siteId`/`driveId` are shaped and resolved.

List-shaped responses (sites, drives, folder children, search results,
lists, permissions, pages) all come back as
`{ "value": [ ... ], "@odata.nextLink"?: string }`; use `$top` to size a
page and follow `@odata.nextLink` verbatim for the next one — see
[Pagination](microsoft-sharepoint-api-gotchas.md#pagination). `listColumns`
is the one list-shaped response with no next-page property (Graph doesn't
paginate it).

### Sites & drives

- `GET /sites?search={query}&$top={n}` → page of site objects: `id` (string,
  composite), `name?`, `displayName?`, `description?`, `webUrl?`,
  `createdDateTime?` (ISO 8601), `lastModifiedDateTime?` (ISO 8601).
- `GET /sites/{siteId}` → a single site object (same shape as above, plus
  `siteCollection.hostname?` and `sharepointIds.{siteId,webId}?`). `siteId`
  may be a composite id, the literal `root`, or a `{hostname}:/{path}` form.
- `GET /sites/{siteId}/drives?$top={n}` → page of drive objects: `id`,
  `name?`, `driveType?`, `webUrl?`, `description?`.

### Files & folders (drive items)

- `GET {driveBase}/root/children` or `GET {driveBase}/items/{itemId}/children`
  → page of drive-item objects.
- `GET {driveBase}/root/search(q='{query}')` → page of drive-item objects
  (search is a path segment, not a query parameter).
- `GET {driveBase}/items/{itemId}` → one drive-item object.
- `POST {driveBase}/root/children` or `.../items/{parentId}/children`, body
  `{ "name": string, "folder": {}, "@microsoft.graph.conflictBehavior":
"rename"|"replace"|"fail" }` → the created folder as a drive-item object.
- `PUT {driveBase}/root:/{fileName}:/content?@microsoft.graph.conflictBehavior=...`
  (or `.../items/{parentId}:/{fileName}:/content`), raw body = the file's
  bytes, `Content-Type` set to the file's actual type (a plain-text upload
  uses `text/plain`) → the created drive-item object.
- Uploading larger/binary files uses a **resumable session**: first
  `POST {driveBase}/root:/{fileName}:/createUploadSession` (or the
  `/items/{itemId}/createUploadSession` form to replace an existing file),
  optional body `{ "item": { "@microsoft.graph.conflictBehavior": ... } }`
  → `{ "uploadUrl": string, "expirationDateTime": string }`; then `PUT` each
  byte-range fragment straight to that `uploadUrl`, sequentially, with
  **no `Authorization` header** on those PUTs, each one carrying a
  `Content-Length` header (the size of that request) and a `Content-Range`
  header of the form `bytes {start}-{end}/{totalSize}` describing where the
  fragment lands in the overall file (fresh source, not yet in the gotchas
  doc — [driveitem-createuploadsession](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession):
  "The **Content-Length** header specifies the size of the current request.
  ... The **Content-Range** header indicates the range of bytes in the
  overall file that this request represents."). Fragment-size and
  auth-header specifics — see
  [Uploads use a resumable session](microsoft-sharepoint-api-gotchas.md#uploads-use-a-resumable-session).
- `PATCH {driveBase}/items/{itemId}`, body any of
  `{ "parentReference": { "id": string }, "name": string }` (send only the
  keys you're changing) → the updated drive-item object. Same-library only —
  see [Move is same-drive only](microsoft-sharepoint-api-gotchas.md#move-is-same-drive-only).
- `POST {driveBase}/items/{itemId}/copy`, body
  `{ "parentReference": { "driveId": string, "id"?: string }, "name"?:
string, "@microsoft.graph.conflictBehavior": "rename"|"replace"|"fail" }`
  → `202 Accepted` with **no body**; the destination monitor URL is only in
  the `Location` response header. Poll that URL directly (unauthenticated)
  → `{ "status": "notStarted"|"inProgress"|"completed"|"failed",
"percentageComplete"?: number, "resourceId"?: string, "error"?: { "code"?:
string, "message"?: string } }`. Async mechanics and conflict-behavior
  timing — see
  [Copy is asynchronous](microsoft-sharepoint-api-gotchas.md#copy-is-asynchronous).
- `DELETE {driveBase}/items/{itemId}` → `204 No Content`. Recycle-bin
  semantics — see
  [Delete moves files to the recycle bin](microsoft-sharepoint-api-gotchas.md#delete-moves-files-to-the-recycle-bin).
- `GET {driveBase}/items/{itemId}/content?format=pdf|html|jpg|glb` → a
  redirect whose `Location` header is the converted file's download URL
  (capture the header directly rather than auto-following, to get the URL
  itself). Conversion support varies by source type — see
  [Export/convert](microsoft-sharepoint-api-gotchas.md#exportconvert).
- Drive-item objects seen across the calls above carry at least: `id`
  (string), `name` (string), `webUrl` (string), `parentReference` (`{
"driveId"?: string, "id"?: string }`), a `folder` facet object (present
  when the item is a folder), and — for files — a downloadable-content URL.
  That URL's lifetime/auth rules — see
  [Download URLs are short-lived and unauthenticated](microsoft-sharepoint-api-gotchas.md#download-urls-are-short-lived-and-unauthenticated).

### Sharing & permissions

- `POST {driveBase}/items/{itemId}/createLink`, body
  `{ "type": "view"|"edit"|"embed", "scope"?: "anonymous"|"organization"|"users",
"expirationDateTime"?: string }` → a permission object whose `link.webUrl`
  is the shareable URL. Which `type`/`scope` values apply to SharePoint vs.
  personal OneDrive — see
  [Sharing links](microsoft-sharepoint-api-gotchas.md#sharing-links-createsharinglink).
- `POST {driveBase}/items/{itemId}/invite`, body
  `{ "recipients": [{ "email": string }], "roles": ("read"|"write")[],
"requireSignIn"?: boolean, "sendInvitation"?: boolean, "message"?: string,
"expirationDateTime"?: string }` → `200` or `207 Multi-Status`, body
  `{ "value": [ permission-or-error, ... ] }` — treat `207` as success and
  read every entry, since some recipients can succeed while others carry
  their own `error` object. Partial-success details — see
  [Invitations](microsoft-sharepoint-api-gotchas.md#invitations-invitetoitem).
- `GET {driveBase}/items/{itemId}/permissions?$top={n}` → page of permission
  objects (`id`, `link?`, `roles?`, ...). Caller-visibility rules — see
  [Permissions](microsoft-sharepoint-api-gotchas.md#permissions-listitempermissions--removeitempermission).
- `DELETE {driveBase}/items/{itemId}/permissions/{permissionId}` →
  `204 No Content`. Which permissions are removable — see the same
  [Permissions](microsoft-sharepoint-api-gotchas.md#permissions-listitempermissions--removeitempermission)
  section.

### Lists & list items

- `GET /sites/{siteId}/lists?$top={n}` → page of list objects: `id`,
  `displayName?`, `description?`, `list.template?` (e.g. distinguishes a
  generic list from a document library).
- `POST /sites/{siteId}/lists`, body
  `{ "displayName": string, "description"?: string, "list": { "template":
"genericList"|"documentLibrary"|"survey"|"links"|"announcements"|
"contacts"|"events"|"tasks" } }` → the created list object. Permission
  scope needed to create a list — see
  [Auth & permission scopes](microsoft-sharepoint-api-gotchas.md#auth--permission-scopes).
- `GET /sites/{siteId}/lists/{listId}/columns` (not paginated) → array of
  column objects: `id?`, `name` (the internal key used in `fields`),
  `displayName?`, `columnGroup?`, `readOnly?`, `required?`, `hidden?`, plus a
  type facet object keyed by type (`text`, `number`, `boolean`, `dateTime`,
  `choice.choices` (string array), `lookup`, `personOrGroup`, `currency`).
- `GET /sites/{siteId}/lists/{listId}/items?$expand=fields($select=col1,col2)&$filter={odata}&$top={n}`
  → page of list-item objects: `id`, `fields` (an object of column values
  keyed by internal column name). Send header
  `Prefer: HonorNonIndexedQueriesWarningMayFailRandomly` whenever you pass
  `$filter`. Which columns need to be named in `$select` to get real values
  instead of a raw id, and the cap on how many such columns one query can
  carry — see
  [Lists, list items & columns](microsoft-sharepoint-api-gotchas.md#lists-list-items--columns).
- `GET /sites/{siteId}/lists/{listId}/items/{itemId}?$expand=fields($select=...)`
  → one list-item object (same shape as above).
- `POST /sites/{siteId}/lists/{listId}/items`, body
  `{ "fields": { [internalColumnName: string]: value } }` → the created
  list-item object. For a column value that's an array (e.g. a multi-select
  choice column), the request body must also carry a sibling key
  `"{internalColumnName}@odata.type": "Collection(Edm.String)"` next to it.
  Which column types accept an array at all — see
  [Lists, list items & columns](microsoft-sharepoint-api-gotchas.md#lists-list-items--columns).
- `PATCH /sites/{siteId}/lists/{listId}/items/{itemId}/fields`, body = the
  field-value object directly (not wrapped in a `fields` key) — same
  array/`@odata.type` rule as create — → the updated field-value object.
  Only the keys you send are changed.
- `DELETE /sites/{siteId}/lists/{listId}/items/{itemId}` →
  `204 No Content`. Recovery semantics (different from file delete) — see
  [Lists, list items & columns](microsoft-sharepoint-api-gotchas.md#lists-list-items--columns).

### Site pages

- `GET /sites/{siteId}/pages/microsoft.graph.sitePage?$top={n}` → page of
  site-page objects. Note the `microsoft.graph.sitePage` type-cast path
  segment.
- `GET /sites/{siteId}/pages/{pageId}/microsoft.graph.sitePage` → one
  site-page object.
- `POST /sites/{siteId}/pages`, body
  `{ "@odata.type": "#microsoft.graph.sitePage", "title": string, "name":
string (ends in ".aspx"), "description"?: string, "pageLayout":
"article"|"home", "canvasLayout"?: { "horizontalSections": [{ "layout":
"oneColumn", "id": string, "columns": [{ "id": string, "webparts": [{
"@odata.type": "#microsoft.graph.textWebPart", "innerHtml": string }] }]
}] } }` → the created (draft) site-page object. Draft state and web-part
  support — see
  [Site pages](microsoft-sharepoint-api-gotchas.md#site-pages).
- `POST /sites/{siteId}/pages/{pageId}/microsoft.graph.sitePage/publish` →
  `204 No Content`. Approval-flow interaction — see
  [Site pages](microsoft-sharepoint-api-gotchas.md#site-pages).
- `DELETE /sites/{siteId}/pages/{pageId}` → `204 No Content`. Note: **no**
  `microsoft.graph.sitePage` cast segment here, unlike the three calls above.

## Error-handling pattern

Any non-2xx Graph response (with the `207` exception below) carries a JSON
body shaped:

```
{
  "error": {
    "code": string,
    "message": string,
    "innererror"?: { "code": string, ... },
    "details"?: [ { ... }, ... ]
  }
}
```

Branch on `error.code`, not `error.message`. Status-code-specific behavior
(403/404/429, and which codes carry a `Retry-After`) — see
[Error envelope](microsoft-sharepoint-api-gotchas.md#error-envelope).

A few operations don't follow the plain request → error-or-JSON shape:

- **Copy (`copy`) is fire-and-forget up front.** The initiating call answers
  `202 Accepted` with no JSON body; a conflict or other failure only shows up
  later as `{ "status": "failed", "error": { "code", "message" } }` when you
  poll the monitor URL — see
  [Copy is asynchronous](microsoft-sharepoint-api-gotchas.md#copy-is-asynchronous).
- **Invite (`invite`) can partially fail.** `207 Multi-Status` is a genuine
  success status here, not an error — treat it as `ok` and inspect every
  entry in the returned array, since a per-recipient failure carries its own
  `error` object inside an otherwise-successful response — see
  [Invitations](microsoft-sharepoint-api-gotchas.md#invitations-invitetoitem).
- **Export/convert (`content?format=`) answers with a redirect**, not a
  body — read the `Location` response header for the converted file's URL
  instead of parsing JSON.
- **Deletes and publish answer `204 No Content`** — there's nothing to
  parse; a 2xx with an empty body is the success case.
- **The copy-monitor URL and any pre-authenticated download/upload URL are
  called with no `Authorization` header at all** — they're bearer tokens
  in URL form already. Sending one anyway risks a `401` — see
  [Download URLs are short-lived and unauthenticated](microsoft-sharepoint-api-gotchas.md#download-urls-are-short-lived-and-unauthenticated).

## Critical rules — load before you write these calls

Every entry below is a pointer, not a restatement — open the file and read
the section before relying on the behavior.

| Area                                                                         | Section in the gotchas doc                                                                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Which permission scope a call needs; personal-account support                | [Auth & permission scopes](microsoft-sharepoint-api-gotchas.md#auth--permission-scopes)                                                    |
| Error codes, `Retry-After`, what 403/404/429 mean                            | [Error envelope](microsoft-sharepoint-api-gotchas.md#error-envelope)                                                                       |
| How to follow `@odata.nextLink` / set `$top`                                 | [Pagination](microsoft-sharepoint-api-gotchas.md#pagination)                                                                               |
| Composite site ids, `root`, `{hostname}:/{path}`, default vs. specific drive | [Sites & drives](microsoft-sharepoint-api-gotchas.md#sites--drives)                                                                        |
| Download-URL lifetime and no-auth-header rule                                | [Download URLs are short-lived and unauthenticated](microsoft-sharepoint-api-gotchas.md#download-urls-are-short-lived-and-unauthenticated) |
| Copy semantics: async, monitor URL, conflict timing                          | [Copy is asynchronous](microsoft-sharepoint-api-gotchas.md#copy-is-asynchronous)                                                           |
| Resumable-upload fragment-size and auth-header rules                         | [Uploads use a resumable session](microsoft-sharepoint-api-gotchas.md#uploads-use-a-resumable-session)                                     |
| Move is same-library only                                                    | [Move is same-drive only](microsoft-sharepoint-api-gotchas.md#move-is-same-drive-only)                                                     |
| Delete recoverability (files vs. list items)                                 | [Delete moves files to the recycle bin](microsoft-sharepoint-api-gotchas.md#delete-moves-files-to-the-recycle-bin)                         |
| Search index lag                                                             | [Search matches content and can lag the index](microsoft-sharepoint-api-gotchas.md#search-matches-content-and-can-lag-the-index)           |
| Which conversions are supported                                              | [Export/convert](microsoft-sharepoint-api-gotchas.md#exportconvert)                                                                        |
| Sharing-link `type`/`scope` restrictions                                     | [Sharing links](microsoft-sharepoint-api-gotchas.md#sharing-links-createsharinglink)                                                       |
| Invitation partial-success handling                                          | [Invitations](microsoft-sharepoint-api-gotchas.md#invitations-invitetoitem)                                                                |
| Who can see/remove which permissions                                         | [Permissions](microsoft-sharepoint-api-gotchas.md#permissions-listitempermissions--removeitempermission)                                   |
| Lookup-id columns, the lookup-column cap, multi-value writes                 | [Lists, list items & columns](microsoft-sharepoint-api-gotchas.md#lists-list-items--columns)                                               |
| Draft/publish state, type-cast path segment, web-part support                | [Site pages](microsoft-sharepoint-api-gotchas.md#site-pages)                                                                               |

## Where to go next

- [Auth & permission scopes](microsoft-sharepoint-api-gotchas.md#auth--permission-scopes)
- [Error envelope](microsoft-sharepoint-api-gotchas.md#error-envelope)
- [Pagination](microsoft-sharepoint-api-gotchas.md#pagination)
- [Sites & drives](microsoft-sharepoint-api-gotchas.md#sites--drives)
- [Download URLs are short-lived and unauthenticated](microsoft-sharepoint-api-gotchas.md#download-urls-are-short-lived-and-unauthenticated)
- [Copy is asynchronous](microsoft-sharepoint-api-gotchas.md#copy-is-asynchronous)
- [Uploads use a resumable session](microsoft-sharepoint-api-gotchas.md#uploads-use-a-resumable-session)
- [Move is same-drive only](microsoft-sharepoint-api-gotchas.md#move-is-same-drive-only)
- [Delete moves files to the recycle bin](microsoft-sharepoint-api-gotchas.md#delete-moves-files-to-the-recycle-bin)
- [Search matches content and can lag the index](microsoft-sharepoint-api-gotchas.md#search-matches-content-and-can-lag-the-index)
- [Export/convert](microsoft-sharepoint-api-gotchas.md#exportconvert)
- [Sharing links](microsoft-sharepoint-api-gotchas.md#sharing-links-createsharinglink)
- [Invitations](microsoft-sharepoint-api-gotchas.md#invitations-invitetoitem)
- [Permissions](microsoft-sharepoint-api-gotchas.md#permissions-listitempermissions--removeitempermission)
- [Lists, list items & columns](microsoft-sharepoint-api-gotchas.md#lists-list-items--columns)
- [Site pages](microsoft-sharepoint-api-gotchas.md#site-pages)
