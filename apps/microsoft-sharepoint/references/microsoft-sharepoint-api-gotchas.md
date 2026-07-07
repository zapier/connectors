# Microsoft SharePoint (Microsoft Graph) — API gotchas

Behavioral notes for the Microsoft SharePoint connector, which calls the
**Microsoft Graph v1.0** API (`https://graph.microsoft.com/v1.0`). Every claim
here is sourced from Microsoft's public documentation; citations are inline.
Load this when a call errors unexpectedly, when addressing sites/drives, or when
working with list-item column values or site pages.

## Auth & permission scopes

- Read operations (get/list sites, drives, items, lists, pages) accept the
  least-privileged **`Sites.Read.All`**; write operations generally need
  **`Sites.ReadWrite.All`** (files also accept `Files.ReadWrite`/`.All`).
  ([site-get](https://learn.microsoft.com/en-us/graph/api/site-get),
  [driveitem-copy](https://learn.microsoft.com/en-us/graph/api/driveitem-copy))
- **Creating a list needs `Sites.Manage.All`** — a higher scope than the
  read/write tools. For a work/school account it is the _only_ delegated option
  ("Not available" for anything lower).
  ([list-create](https://learn.microsoft.com/en-us/graph/api/list-create))
- Delegated access with **personal Microsoft accounts is not supported** for
  SharePoint site/list APIs.
  ([site-get](https://learn.microsoft.com/en-us/graph/api/site-get),
  [list-create](https://learn.microsoft.com/en-us/graph/api/list-create))

## Error envelope

- Errors use standard HTTP status codes plus a single JSON `error` object with
  machine-readable **`code`**, human-readable **`message`**, optional nested
  **`innererror`** (with its own more-specific `code`), and **`details`** (an
  array of per-operation errors for batch/bulk calls). Code against `code`, not
  `message` — messages aren't localized and can change.
  ([errors](https://learn.microsoft.com/en-us/graph/errors))
- **403 Forbidden** — "Access is denied … The user does not have enough
  permission or does not have a required license." Recovery: a tenant admin may
  need to consent to the required SharePoint scopes, or the account must be
  reconnected with sufficient access.
  ([errors](https://learn.microsoft.com/en-us/graph/errors))
- **404 Not Found** — "The requested resource doesn't exist." Usually a stale id
  (the item moved or was deleted) or a malformed composite site id; re-resolve
  via `findSites` / `listDrives` / `getItem`.
  ([errors](https://learn.microsoft.com/en-us/graph/errors))
- **429 Too Many Requests** — the app has been throttled; don't repeat until the
  indicated time has elapsed. `409`/`503` may carry a `Retry-After` header.
  ([errors](https://learn.microsoft.com/en-us/graph/errors))

## Pagination

- List responses page with an opaque **`@odata.nextLink`** — "If there are too
  many matches the response will be paged and an `@odata.nextLink` property will
  contain a URL to the next page of results." Fetch that URL verbatim; never
  reconstruct `$skiptoken`. `$top` sets the page size.
  ([driveitem-search](https://learn.microsoft.com/en-us/graph/api/driveitem-search))

## Sites & drives

- A site **id is composite**: `{hostname},{siteCollectionId},{webId}` (e.g.
  `contoso.sharepoint.com,2C71…,2D22…`). Pass it verbatim to site-scoped tools.
  ([site-get](https://learn.microsoft.com/en-us/graph/api/site-get))
- `getSite` also accepts the literal **`root`** (`GET /sites/root`) for the
  tenant root, and a **`{hostname}:/{server-relative-path}`** form to resolve a
  known URL to its id (`GET /sites/contoso.sharepoint.com:/teams/1drvteam`).
  ([site-get](https://learn.microsoft.com/en-us/graph/api/site-get))
- `findSites` does a free-text keyword search **across the tenant**
  (`GET /sites?search={query}`); it doesn't enumerate every site, so search by
  keyword or resolve a known URL with `getSite`.
  ([site-search](https://learn.microsoft.com/en-us/graph/api/site-search))
- A site exposes a **default document library** at `/sites/{siteId}/drive`; file
  and folder tools target it when `driveId` is omitted, or a specific library at
  `/sites/{siteId}/drives/{driveId}` when supplied. Resolve `driveId` via
  `listDrives`.
  ([driveitem-copy](https://learn.microsoft.com/en-us/graph/api/driveitem-copy))

## Files & folders

### Download URLs are short-lived and unauthenticated

- `@microsoft.graph.downloadUrl` (and the `exportFile` download URL) is
  pre-authenticated: "A URL that can be used to download this file's content.
  Authentication isn't required with this URL." It is **short-lived** — "The …
  value is a short-lived URL and can't be cached. The URL is invalidated after
  … a short period of time (1 hour)." Fetch it directly with **no `Authorization`
  header**.
  ([driveitem](https://learn.microsoft.com/en-us/graph/api/resources/driveitem))

### Copy is asynchronous

- `copyItem` returns **`202 Accepted`** with a **`Location`** header monitor URL;
  the copy "is queued and processed asynchronously." Poll that URL with
  `getCopyStatus`; the status report carries `status`
  (`notStarted`/`inProgress`/`completed`/`failed`), `percentageComplete`, and
  `resourceId` once complete.
  ([driveitem-copy](https://learn.microsoft.com/en-us/graph/api/driveitem-copy))
- **Conflict handling is deferred.** Graph's own default is `fail`, but "Because
  no conflict behavior is provided, the API accepts the request but fails during
  processing. The operation returns a `nameAlreadyExists` error" — i.e. it 202s
  up front and only reports `status: failed` at the monitor URL. The connector
  defaults `conflictBehavior` to `rename` to avoid that; set `fail` to reject
  conflicts (surfaced only when you poll). `replace` is files-only.
  ([driveitem-copy](https://learn.microsoft.com/en-us/graph/api/driveitem-copy))

### Uploads use a resumable session

- `uploadFile` / `replaceFile` open a **resumable upload session**, then PUT the
  bytes to the returned **pre-authenticated `uploadUrl`**. Do **not** send an
  `Authorization` header on the chunk PUTs — "If you include the `Authorization`
  header when issuing the PUT call, it might result in an `HTTP 401 Unauthorized`
  response. … Don't include it when issuing the PUT call."
  ([driveitem-createuploadsession](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession))
- Fragment rules: "the maximum bytes in any given request is less than **60
  MiB**," and "the size of each byte range **MUST be a multiple of 320 KiB
  (327,680 bytes)**." Fragments must be uploaded sequentially.
  ([driveitem-createuploadsession](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession))
- Simple upload (used by `uploadTextFile`) "only supports files up to **250 MB**
  in size."
  ([driveitem-put-content](https://learn.microsoft.com/en-us/graph/api/driveitem-put-content))

### Move is same-drive only

- `moveItem` updates the item's `parentReference` (a PATCH). "**Items cannot be
  moved between Drives using this request.**" For a cross-library/site move, copy
  then delete. Rename by supplying `name`.
  ([driveitem-move](https://learn.microsoft.com/en-us/graph/api/driveitem-move))

### Delete moves files to the recycle bin

- `deleteItem` on a file/folder "moves the items to the recycle bin instead of
  permanently deleting the item" — recoverable.
  ([driveitem-delete](https://learn.microsoft.com/en-us/graph/api/driveitem-delete))
- **List-item delete is different:** the API only "removes an item from a list";
  unlike file deletion it documents no recycle-bin restore path, so don't rely on
  recovering a deleted list item through the API.
  ([listitem-delete](https://learn.microsoft.com/en-us/graph/api/listitem-delete))

### Search matches content and can lag the index

- `findFiles` searches "across several fields including filename, metadata, and
  file content," over the drive hierarchy from the root.
  ([driveitem-search](https://learn.microsoft.com/en-us/graph/api/driveitem-search))
- Newly created/uploaded items may not appear immediately: SharePoint's search
  index isn't real-time — per Microsoft's support guidance it can take minutes
  (occasionally longer) for recently added content to become searchable.
  (Observed / support-tier, not the API reference:
  [search-results-missing](https://learn.microsoft.com/en-us/troubleshoot/sharepoint/search/search-results-missing))

### Export/convert

- `exportFile` downloads a converted copy via a **302 redirect to a short-lived
  pre-authenticated URL** — "Preauthenticated URLs are only valid for a short
  period of time (a few minutes) and don't require an `Authorization` header."
  "**Not all files can be converted into all formats.**" PDF accepts Office
  document sources (doc/docx/xls/xlsx/ppt/pptx and more).
  ([driveitem-get-content-format](https://learn.microsoft.com/en-us/graph/api/driveitem-get-content-format))

## Sharing

### Sharing links (`createSharingLink`)

- `type`: `view` = read-only, `edit` = read-write, `embed` = an embeddable link
  that "is only available for files in **OneDrive personal**." Use `view`/`edit`
  for SharePoint.
  ([driveitem-createlink](https://learn.microsoft.com/en-us/graph/api/driveitem-createlink))
- `scope`: `anonymous` (anyone with the link, may be disabled by an admin),
  `organization` ("Anyone signed into your organization … Only available in
  OneDrive for Business and SharePoint"), `users` (specific people). Omit to get
  the org's default link type.
  ([driveitem-createlink](https://learn.microsoft.com/en-us/graph/api/driveitem-createlink))

### Invitations (`inviteToItem`)

- `roles` grants `read` or `write`; `message` is capped at **2,000 characters**.
  ([driveitem-invite](https://learn.microsoft.com/en-us/graph/api/driveitem-invite))
- **Partial success is real:** "When inviting multiple recipients, it's possible
  for the notification to succeed for some and fail for others … the service
  returns a partial success response with a `207 Multi-Status` status code" and a
  per-recipient `error` object. Check every result.
  ([driveitem-invite](https://learn.microsoft.com/en-us/graph/api/driveitem-invite))

### Permissions (`listItemPermissions` / `removeItemPermission`)

- Permission visibility is caller-scoped: "For the owner of the item, all
  sharing permissions will be returned. … For a non-owner caller, only the
  sharing permissions that apply to the caller are returned."
  ([driveitem-list-permissions](https://learn.microsoft.com/en-us/graph/api/driveitem-list-permissions))
- **Only non-inherited permissions can be removed:** "Only sharing permissions
  that aren't inherited can be deleted. The `inheritedFrom` property must be
  `null`."
  ([permission-delete](https://learn.microsoft.com/en-us/graph/api/permission-delete))

## Lists, list items & columns

- A new list defaults to the **`genericList`** template ("If the list facet or
  template is unspecified, the list defaults to the `genericList` template, which
  includes a Title column"); `documentLibrary` is the other common template.
  ([list-create](https://learn.microsoft.com/en-us/graph/api/list-create))
- Column values live in a **`fields`** object keyed by the column's **internal
  name** (from `listColumns` — `columnDefinition.name`, distinct from
  `displayName`). Reads return values only when fields are expanded
  (`?expand=fields` / `?expand=fields(select=…)`).
  ([listitem-list](https://learn.microsoft.com/en-us/graph/api/listitem-list),
  [list-list-columns](https://learn.microsoft.com/en-us/graph/api/list-list-columns))
- **Lookup / person / group columns return as `{Column}LookupId`** (a numeric
  id, not the value) unless you request the base column name via the `columns`
  input — Microsoft Graph "returns the LookupId for lookup columns … specify the
  return fields … `?$expand=fields($select=lookupcolumn1,…)`."
  (Documented in Microsoft Q&A:
  [expand lookup field](https://learn.microsoft.com/en-us/answers/questions/916552/how-to-expand-lookup-field-when-listing-items))
- **Max ~12 lookup columns per query.** SharePoint Online's List View Lookup
  Threshold "is twelve lookup columns" and "cannot be overcome in SharePoint
  Online." It counts lookup **and** person/group columns; exceeding it fails the
  query with "the number of lookup columns … exceeds the lookup column
  threshold."
  ([List View Threshold](https://support.microsoft.com/en-us/office/list-view-threshold-for-large-lists-and-libraries-e2ea4d5d-ec23-4171-95c4-c7f5b5dbfd8a))
- **Multi-select choice columns** take an array of plain values; the write must
  carry a sibling `"{column}@odata.type": "Collection(Edm.String)"` marker (the
  connector adds this automatically — pass a plain array).
  (Microsoft Q&A:
  [multi-value choice update](https://learn.microsoft.com/en-us/answers/questions/778081/how-to-update-sharepoint-list-lookup-column-accept))
- `updateListItem` PATCHes the item's `/fields`; only the keys you send change.
  ([listitem-list](https://learn.microsoft.com/en-us/graph/api/listitem-list))

## Site pages

- Reading/listing/publishing pages goes through the site-pages list with a
  **`microsoft.graph.sitePage` type-cast segment** — e.g.
  `GET /sites/{siteId}/pages/microsoft.graph.sitePage` (list) and
  `POST /sites/{siteId}/pages/{pageId}/microsoft.graph.sitePage/publish`.
  Deleting is the exception: `deletePage` is a plain
  `DELETE /sites/{siteId}/pages/{pageId}` with **no** cast segment.
  ([sitepage-list](https://learn.microsoft.com/en-us/graph/api/sitepage-list),
  [sitepage-publish](https://learn.microsoft.com/en-us/graph/api/sitepage-publish))
- **Create makes a draft.** A created page comes back with
  `publishingState.level: "checkout"` — it isn't live until published. Creation
  requires the body to include `"@odata.type": "#microsoft.graph.sitePage"`.
  ([sitepage-create](https://learn.microsoft.com/en-us/graph/api/sitepage-create))
- `publishPage` "makes the version of the page available to all users." **If a
  page-approval flow is active, publish waits on approval:** "If a page approval
  flow has been activated in the page library, the page is not published until
  the approval flow is completed."
  ([sitepage-publish](https://learn.microsoft.com/en-us/graph/api/sitepage-publish))
- Graph supports a fixed set of web parts when creating a page ("Only the web
  part listed in the Supported web parts section are supported … Attempting to
  add unsupported web parts will result in a failure or exception"). `createPage`
  renders its `content` as a single **text web part** — it doesn't build image,
  embed, or other web parts.
  ([sitepage-create](https://learn.microsoft.com/en-us/graph/api/sitepage-create))
