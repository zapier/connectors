# Microsoft OneDrive (Graph) API gotchas

Behavioral quirks of the Microsoft Graph v1.0 endpoints this connector calls. Every claim here is drawn from the public [Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/onedrive) and [Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/) docs; each section links its source. Load this before debugging an unexpected error, resolving a drive/item id, uploading or exporting, or touching shared content, links, or permissions.

## Auth, scopes, and the `403`

- Every call is a [Microsoft Graph](https://learn.microsoft.com/en-us/graph/api/resources/onedrive) request authorized by a single OAuth 2.0 bearer token (`Authorization: Bearer <token>`), obtained through delegated (user-context) consent.
- The delegated file scopes: **`Files.ReadWrite`** covers the signed-in user's own OneDrive; **`Files.ReadWrite.All`** is required to reach other users' or shared drives/items (per the [`driveItem`](https://learn.microsoft.com/en-us/graph/api/resources/driveitem) and method permission tables). Both are user-consentable delegated permissions — the [permissions reference](https://learn.microsoft.com/en-us/graph/permissions-reference#filesreadwriteall) lists `AdminConsentRequired: No` for the _delegated_ form of `Files.ReadWrite.All` (the `Yes` applies only to the application/app-only permission), so no tenant-admin grant is required. A scope that was never consented fails at call time with `403` (see below).
- A token missing a granted/consented scope fails at call time with **`403 Forbidden`**, not at token issuance. If a read/write that should be allowed returns `403`, the usual cause is the scope was never consented (especially `Files.ReadWrite.All` for shared/other-drive targets). See the [error responses](https://learn.microsoft.com/en-us/graph/errors) reference.
- Access tokens are short-lived: the identity platform assigns a **default lifetime that varies randomly between 60 and 90 minutes (≈75 min average)** ([access tokens](https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens#token-lifetime)). Expect to refresh/re-mint.

## Addressing drives and items

- Two addressing roots: the signed-in user's default drive at **`/me/drive`**, or a specific drive at **`/drives/{drive-id}`**; items are then addressed by id (`/items/{item-id}`) or by path. See [`drive`](https://learn.microsoft.com/en-us/graph/api/resources/drive) and [`driveItem`](https://learn.microsoft.com/en-us/graph/api/resources/driveitem).
- A user's OneDrive drive is provisioned lazily — the first [Get drive](https://learn.microsoft.com/en-us/graph/api/drive-get) against `/me/drive` (delegated) will provision it if it doesn't yet exist.
- Item ids are stable but not eternal: a deleted/moved item's old id yields **`404 itemNotFound`**. Re-resolve the id (list the parent, or search) rather than reusing a stale one.

## The error envelope

Graph returns errors as a JSON object with a top-level `error` containing `code` (a string) and `message` (a human-readable string, not for programmatic branching), plus optional `innerError`/`details` ([errors](https://learn.microsoft.com/en-us/graph/errors)). Codes this connector surfaces:

| HTTP  | Meaning / when                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `403` | Scope not consented, or the token's user lacks rights to the target (see auth section).                                                                                                                                                                                                                                                                                 |
| `404` | Item/drive id no longer resolves (stale id, deleted, or never visible to this user).                                                                                                                                                                                                                                                                                    |
| `409` | Name conflict when the effective conflict behavior is `fail` (see below).                                                                                                                                                                                                                                                                                               |
| `429` | Throttled — **honor the `Retry-After` header** before retrying ([throttling](https://learn.microsoft.com/en-us/graph/throttling)).                                                                                                                                                                                                                                      |
| `503` | Service unavailable / throttled — also carries `Retry-After`; back off.                                                                                                                                                                                                                                                                                                 |
| `507` | `Insufficient Storage` — an upload's declared `fileSize` exceeds the available drive quota, so the upload session isn't created ([create upload session](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession)); see the [`quota`](https://learn.microsoft.com/en-us/graph/api/resources/quota) states (`normal`/`nearing`/`critical`/`exceeded`). |

Throttling guidance: Graph tells you to wait the number of seconds in `Retry-After` and not to hammer through `429`/`503`; repeated ignoring escalates ([throttling](https://learn.microsoft.com/en-us/graph/throttling)).

## Pagination

- Collection responses (list children, list permissions) page with an opaque **`@odata.nextLink`** — follow it verbatim; don't synthesize `$skiptoken`/`$skip` yourself ([paging](https://learn.microsoft.com/en-us/graph/paging)).
- The **Search API** (`findItemsByKql`) is the exception: it pages by numeric **`from` offset** in the request body, and returns `moreResultsAvailable` ([search query](https://learn.microsoft.com/en-us/graph/api/search-query)).

## Download URLs are short-lived and pre-authenticated

- A `driveItem`'s content download is exposed via the **`@microsoft.graph.downloadUrl`** property (and `GET /items/{id}/content` returns a `302` redirect to it). This URL is **pre-authenticated — send NO `Authorization` header** — and **short-lived** (valid only for a short window; re-fetch the item to get a fresh one) ([driveItem](https://learn.microsoft.com/en-us/graph/api/resources/driveitem), [get content](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content)).
- `exportFile` (`GET /items/{id}/content?format=…`) converts on the fly (e.g. Office docs → `pdf`) and likewise returns a `302` to a short-lived pre-authenticated URL. For **`format=jpg`** you must supply `width` and `height` ([get content in another format](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format)).

## Uploads: simple vs. resumable session

- Small files go via a single **`PUT /items/{parent}:/name:/content`** ([put content](https://learn.microsoft.com/en-us/graph/api/driveitem-put-content)). This connector uses a **resumable upload session** for `uploadFile`/`replaceFile` ([create upload session](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession)).
- Resumable-session rules that a from-scratch caller gets wrong:
  - Each byte-range is a `PUT` to the session's **`uploadUrl`**, which is itself pre-authenticated — **do NOT send an `Authorization` header** on those `PUT`s (doing so can cause a `401`).
  - Fragment size must be a **multiple of 320 KiB** (327,680 bytes); a single `PUT` may carry at most **60 MiB**. Send fragments in order with a correct `Content-Range`.
  - `replaceFile` targeting an existing item **preserves the item id and existing sharing links** (it's new content for the same `driveItem`, not a new item).
  - A zero-byte file has no valid `Content-Range` for a session `PUT`, so this connector uploads empty files via the simple `PUT …/content` path instead of a session.

  ([create upload session](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession))

## Copy is asynchronous

- `copyItem` (`POST /items/{id}/copy`) returns **`202 Accepted`** with a **`Location` header pointing at an opaque monitor URL** — the copy runs in the background. Poll that URL (`getCopyStatus`, which needs no auth) for `inProgress` → `completed`/`failed`; the final resource id appears only when it completes ([copy](https://learn.microsoft.com/en-us/graph/api/driveitem-copy), [long-running actions](https://learn.microsoft.com/en-us/graph/long-running-actions-overview)).
- Failures (including a name conflict) surface **at the monitor URL**, not as an immediate error on the `POST`.

## Conflict behavior (`@microsoft.graph.conflictBehavior`)

- Where a write can collide on name — copy, create folder, upload — the parameter takes **`fail`**, **`replace`**, or **`rename`**. **Graph's own default is `fail`** ([copy](https://learn.microsoft.com/en-us/graph/api/driveitem-copy), [put content](https://learn.microsoft.com/en-us/graph/api/driveitem-put-content)). This connector defaults its create/copy/upload tools to `rename` for ergonomics — a behavior of the connector, not the API.

## Move is within a single drive

- `moveItem` PATCHes the item's **`parentReference`** to relocate it. It moves within the **same drive**; Graph does not move items across drives via this update — use copy for cross-drive ([move](https://learn.microsoft.com/en-us/graph/api/driveitem-move)).

## Delete is a recycle-bin move

- `deleteItem` (`DELETE /items/{id}`) returns **`204 No Content`** and sends the item to the **recycle bin** — recoverable by the user through the OneDrive UI, but there's no Graph v1.0 endpoint to restore it programmatically ([delete](https://learn.microsoft.com/en-us/graph/api/driveitem-delete)).

## Search: per-drive vs. tenant Search API

- **`findFiles`** uses the drive **`search(q=…)`** function — it matches file **name and indexed content**, recursing from the search root, but only within the addressed drive ([search](https://learn.microsoft.com/en-us/graph/api/driveitem-search)).
- **`findItemsByKql`** uses the **Microsoft Search API** (`POST /search/query`, `entityTypes: ["driveItem"]`, KQL `query.queryString`) — it spans the user's **owned and shared** content, and shared hits carry a **`remoteItem`** facet locating their true drive ([search overview](https://learn.microsoft.com/en-us/graph/search-api-overview), [search query](https://learn.microsoft.com/en-us/graph/api/search-query), [remoteItem](https://learn.microsoft.com/en-us/graph/api/resources/remoteitem)).
- **Freshly written items may not appear in search immediately.** Don't treat an empty search result right after a write as authoritative — look the item up by id/path instead.

## Shared content

- A `driveItem` that lives in another drive is represented by a **`remoteItem`** facet carrying the real `driveId`/`id` to address it ([remoteItem](https://learn.microsoft.com/en-us/graph/api/resources/remoteitem)).
- `getItemByShareUrl` resolves any sharing URL by encoding it into a Graph **share token** (`u!<base64url>`) and calling **`GET /shares/{token}/driveItem`** ([shares get](https://learn.microsoft.com/en-us/graph/api/shares-get)).

## Sharing links, invites, and permissions

- **`createSharingLink`** (`POST /items/{id}/createLink`): `type` is `view`, `edit`, or **`embed`** (embed is **personal OneDrive only**); `scope` is `anonymous`, **`organization`** (business/work-or-school accounts only), or `users`. Calling it again for the same item+type+scope is **idempotent** — Graph returns the existing link with `200` rather than minting a duplicate (a brand-new link returns `201`) ([create link](https://learn.microsoft.com/en-us/graph/api/driveitem-createlink)).
- **`inviteToItem`** (`POST /items/{id}/invite`): `roles` are `read`/`write`; an optional `message` is capped at **2000 characters**; inviting multiple recipients can return **`207` (multi-status)** for partial success ([invite](https://learn.microsoft.com/en-us/graph/api/driveitem-invite)).
- **`listItemPermissions`** (`GET /items/{id}/permissions`): a **non-owner sees only the permissions that apply to them**, not the full sharing roster; an inherited permission carries an **`inheritedFrom`** reference to its ancestor. Note: OneDrive for Business and SharePoint document libraries **don't return `inheritedFrom`** ([list permissions](https://learn.microsoft.com/en-us/graph/api/driveitem-list-permissions), [permission](https://learn.microsoft.com/en-us/graph/api/resources/permission)).
- **`removeItemPermission`** (`DELETE /items/{id}/permissions/{permId}`): only **non-inherited** permissions can be deleted (an inherited one must be removed at its source); success is **`204 No Content`** ([delete permission](https://learn.microsoft.com/en-us/graph/api/permission-delete)).
