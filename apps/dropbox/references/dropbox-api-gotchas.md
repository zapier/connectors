# Dropbox API — gotchas & durable knowledge

Per-app behavior the agent needs to call Dropbox's HTTP API v2 correctly. Every
claim here is sourced from Dropbox's public documentation or its official
open-source API spec (the [`dropbox/dropbox-api-spec`](https://github.com/dropbox/dropbox-api-spec)
Stone files). Mechanical details (auth wiring, the connector's byte caps, Zod
shapes) live in code, not here.

## Paths & identifiers

- **A path must start with `/`, and the account root is the empty string `""` — never `"/"`.**
  The write-path format only accepts a leading-slash path or a namespace ref
  ([`WritePath` is `"(/(.|[\r\n])*)|(ns:[0-9]+(/.*)?)"`](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)),
  and read paths additionally allow the empty string for the root
  ([`PathROrId` is `"(/(.|[\r\n])*)?|id:.*|(ns:[0-9]+(/.*)?)"`](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)).
- **A file/folder `id:` works anywhere a path is accepted.** The path-or-id format
  allows an `id:...` value in place of a path
  ([`PathOrId` is `"/(.|[\r\n])*|id:.*|(ns:[0-9]+(/.*)?)"`](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)).
- **`path_lower` vs `path_display`.** `path_lower` is "[The lowercased full path in the user's Dropbox. This always starts with a slash](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)" — the stable, case-insensitive key. `path_display` is "[The cased path to be used for display purposes only](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)."
- **`content_hash`** is "[A hash of the file content. This field can be used to verify data integrity](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)" — algorithm at the [Content hash reference](https://www.dropbox.com/developers/reference/content-hash).
- **Timestamps:** `client_modified` is "[the modification time set by the desktop client](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)"; `server_modified` is "[The last time the file was modified on Dropbox](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)." Prefer `server_modified` for "when did Dropbox receive this."

## The Stone `.tag` wire format

Dropbox's API is generated from the Stone IDL, so unions/enums serialize with a
`.tag` discriminator **on both sides of the wire**: request enums travel as
`{".tag": "<value>"}` and response objects (file/folder metadata, links, path
roots, errors) carry a `.tag`. You can see this in the path-root header values
([`{".tag": "root", "root": "7"}`](https://developers.dropbox.com/dbx-team-files-guide))
and in error bodies (below). The connector wraps requests and unwraps responses
into a clean `type` field for you.

## Error model

- **Errors carry an `error_summary` string** plus a tagged `error` union, e.g.
  `{"error_summary": "to/no_write_permission/..", "error": {".tag": "to", ...}}`.
- **Match `error_summary` by prefix, not by equality.** Per the
  [Error Handling Guide](https://developers.dropbox.com/error-handling-guide):
  "[Prefix matching on error_summary is acceptable, but the summary may contain additional detail appended to the end of the string, making it unsuitable for exact matching](https://developers.dropbox.com/error-handling-guide)." The connector's hints key off these prefixes.
- **Status codes** ([Error Handling Guide](https://developers.dropbox.com/error-handling-guide)):
  `409` is the endpoint-specific error ("[Endpoint specific errors can have a variety of different causes](https://developers.dropbox.com/error-handling-guide)");
  `401` means the token is "[invalid, expired, or lacking sufficient permission](https://developers.dropbox.com/error-handling-guide)";
  `429` means "[Your application is making too many API calls in a short period of time](https://developers.dropbox.com/error-handling-guide)."
- **Read-vs-write not-found asymmetry.** On read, a deleted item resolves to
  `not_found` unless you opt in: `include_deleted` makes the API return
  "[DeletedMetadata ... otherwise LookupError.not_found will be returned](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)."

Common `error_summary` prefixes the agent will hit: `path/not_found`,
`path/malformed_path`, `path/conflict`, `path/insufficient_space`,
`path/disallowed_name`, `too_many_write_operations`, `too_many_requests`,
`missing_scope`, `invalid_grant`, `invalid_root`, `no_permission`,
`settings_error`, `invalid_account_type` (sources for each below / in the rate-limit and namespace sections).

## Rate limits & write serialization

- **`too_many_requests`** — "[You are making too many requests in the past few minutes](https://github.com/dropbox/dropbox-api-spec/blob/master/auth.stone)."
- **`too_many_write_operations`** — "[There are currently too many write operations happening in the user's Dropbox](https://github.com/dropbox/dropbox-api-spec/blob/master/auth.stone)." Dropbox serializes concurrent writes within a namespace; back off and retry.
- **Honor `Retry-After`.** Rate-limit errors carry a `retry_after` value — "[The number of seconds that the app should wait before making another request](https://github.com/dropbox/dropbox-api-spec/blob/master/auth.stone)" — and rate-limit HTTP responses "[may include a Retry-After header, indicating how long your app should wait (in seconds) before retrying](https://developers.dropbox.com/error-handling-guide)."
- **`missing_scope`** — "[The access token does not have the required scope to access the route](https://github.com/dropbox/dropbox-api-spec/blob/master/auth.stone)"; reconnect with the needed permission. `expired_access_token` / `invalid_access_token` mean reconnect.

## Team spaces & namespaces

- **Resolve the namespace from `get_current_account`.** `root_namespace_id` is "[The namespace ID for user's root namespace. It will be the namespace ID of the shared team root if the user is member of a team with a separate team root](https://github.com/dropbox/dropbox-api-spec/blob/master/common.stone)"; `home_namespace_id` is "[The namespace ID for user's home namespace](https://github.com/dropbox/dropbox-api-spec/blob/master/common.stone)." For a team-space member the two differ; for everyone else they match ([team-files guide](https://developers.dropbox.com/dbx-team-files-guide)).
- **Target a namespace with the `Dropbox-API-Path-Root` header**, which "[can be used to perform actions relative to a namespace](https://developers.dropbox.com/dbx-team-files-guide)" (the connector sends `{".tag":"namespace_id","namespace_id":"…"}`).
- **Path-root errors:** the `root` path-root "[results in PathRootError.invalid_root if the user's root namespace has changed](https://github.com/dropbox/dropbox-api-spec/blob/master/common.stone)"; a `namespace_id` path-root "[results in PathRootError.no_permission if you don't have access to this namespace](https://github.com/dropbox/dropbox-api-spec/blob/master/common.stone)."

## Content endpoints (upload / download)

- **Content endpoints take their JSON args in a header, not the body.** "[content-upload and content-download endpoints take their JSON arguments in the Dropbox-API-Arg HTTP header or in the arg URL parameter](https://www.dropbox.com/developers/reference/json-encoding)."
- **The `Dropbox-API-Arg` header must be ASCII-safe.** You "[need to make it 'HTTP header safe'. This means using JSON-style '\uXXXX' escape codes for the character 0x7F and all non-ASCII characters](https://www.dropbox.com/developers/reference/json-encoding)" — otherwise non-ASCII filenames break the request.
- **Single-request uploads cap at 150 MB.** "[Do not use this to upload a file larger than 150 MB. Instead, create an upload session](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)"; an upload session goes up to "[350 GB](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)." The connector switches to a chunked session automatically.

## Pagination (cursor-based, no auto-paging)

- List endpoints return `has_more` + a `cursor`; "[If true, then there are more entries available. Pass the cursor to list_folder/continue to retrieve the rest](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)." Each list tool has a sibling `/continue` endpoint; tools do **not** auto-paginate — pass the cursor back.
- **`list_folder` page size is 1–2000**, and is "[an approximate number and there can be slightly more entries returned in some cases](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)."
- **`search_v2` page size is 1–1000.**
- `recursive` "[applies the list folder operation recursively to all subfolders](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)" — large result sets; page the cursor.

## Writes, conflicts, move/rename, delete

- **`WriteMode` on uploads:** `add` = "[Do not overwrite an existing file if there is a conflict. The autorename strategy is to append a number to the file name](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)"; `overwrite` = "[Always overwrite the existing file](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)"; `update` overwrites only if the `rev` matches.
- **`autorename`** on create/copy/move = "[If there's a conflict, have the Dropbox server try to autorename ... to avoid the conflict](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)."
- **Rename = move.** There is no rename endpoint; `move_v2` relocates a file/folder to a new path (keep the folder, change the last segment to rename).
- **`allow_ownership_transfer`** on move "[Allow moves by owner even if it would result in an ownership transfer for the content being moved. This does not apply to copies](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)."
- **Delete is recoverable, not permanent.** `delete_v2` leaves the item restorable for a plan-dependent window — "[Dropbox Basic, Plus, and Family customers have 30 days ... Professional, Standard, Essentials, and team users have 180 days ... Advanced, Enterprise ... 365 days](https://help.dropbox.com/account-settings/data-retention-policy)" — after which it is scheduled for permanent deletion.

## Shared links

- **Idempotent create.** If a link already exists for the path, creating one
  returns the existing link: "[The shared link already exists. You can call sharing_list_shared_links() to get the existing link](https://dropbox-sdk-python.readthedocs.io/en/latest/api/sharing.html)." The connector surfaces this as a soft success rather than an error.
- **Visibility** ([`RequestedVisibility`](https://github.com/dropbox/dropbox-api-spec/blob/master/shared_links.stone)):
  `public` = "[Anyone who has received the link can access it. No login required](https://github.com/dropbox/dropbox-api-spec/blob/master/shared_links.stone)";
  `team_only` = "[Only members of the same team can access the link. Login is required](https://github.com/dropbox/dropbox-api-spec/blob/master/shared_links.stone)";
  `password` = "[A link-specific password is required to access the link](https://github.com/dropbox/dropbox-api-spec/blob/master/shared_links.stone)."
- **Link access level:** `viewer` = "[Users who use the link can view and comment on the content](https://github.com/dropbox/dropbox-api-spec/blob/master/shared_links.stone)"; `editor` = "[Users who use the link can edit, view and comment on the content](https://github.com/dropbox/dropbox-api-spec/blob/master/shared_links.stone)."
- **`dl=0` vs `dl=1`.** A shared-link URL may already carry query parameters — "[The original shared link URL may contain query string parameters already (for example, dl=0)](https://help.dropbox.com/share/force-download)." To get the bytes, "[force a browser to download the contents of a link rather than display them ... use 'dl=1' as a query parameter](https://help.dropbox.com/share/force-download)."
- **Password & expiration need a paid plan.** Customers on "[Dropbox Professional, Essentials, Standard, Advanced, Business, Business Plus, and Enterprise can create, change, or remove an expiration date for a shared link](https://help.dropbox.com/share/set-link-permissions)" and add a password; the free Basic plan cannot, and the API returns `settings_error` when a setting isn't available on the account.
- **Permanent vs temporary download.** `get_temporary_link` returns a direct download URL that "[will expire in four hours and afterwards you will get 410 Gone](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)" — use a shared link for a durable URL.

## File requests

- A file request is a public upload page: `create` "[Creates a file request for this user](https://github.com/dropbox/dropbox-api-spec/blob/master/file_requests.stone)," letting people upload into a destination folder. `title` "[Must not be empty](https://github.com/dropbox/dropbox-api-spec/blob/master/file_requests.stone)"; `destination` is "[The path of the folder in the Dropbox where uploaded files will be sent](https://github.com/dropbox/dropbox-api-spec/blob/master/file_requests.stone)."
- **Deadlines need a paid plan:** "[Deadlines can only be set by Professional and Business accounts](https://github.com/dropbox/dropbox-api-spec/blob/master/file_requests.stone)" — a Basic account setting one gets `invalid_account_type`.
- A closed request "[will not accept any more file submissions](https://github.com/dropbox/dropbox-api-spec/blob/master/file_requests.stone)"; `file_count` is "[The number of files this file request has received](https://github.com/dropbox/dropbox-api-spec/blob/master/file_requests.stone)."

## Search

- **Filename search is universal; full-text content search needs a paid plan.**
  "[Full-text search is only available on Dropbox Professional, Essentials, Standard, Business, Advanced, Business Plus, and Enterprise](https://help.dropbox.com/view-edit/search-content)" — Basic searches filenames only.
- `file_status` restricts to active vs deleted; `file_categories` and
  `file_extensions` are "[Only supported for active file search](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)."
- The query "[may match across multiple fields ... Query string may be rewritten to improve relevance of results](https://github.com/dropbox/dropbox-api-spec/blob/master/files.stone)."

## Account

`get_current_account` gets "[information about the current user's account](https://github.com/dropbox/dropbox-api-spec/blob/master/users.stone)" — the who-am-I / which-namespace resolver. `account_type` is `basic` ("[The basic account type](https://github.com/dropbox/dropbox-api-spec/blob/master/users_common.stone)"), `pro` ("[The Dropbox Pro account type](https://github.com/dropbox/dropbox-api-spec/blob/master/users_common.stone)"), or `business` ("[The Dropbox Business account type](https://github.com/dropbox/dropbox-api-spec/blob/master/users_common.stone)"). `country` is a "[two-letter country code ... based on ISO 3166-1](https://github.com/dropbox/dropbox-api-spec/blob/master/users.stone)."

## Paid-plan-gated features (quick reference)

These return `settings_error` / `invalid_account_type` on a Basic account and
need a paid plan: shared-link [password & expiration](https://help.dropbox.com/share/set-link-permissions),
file-request [deadlines](https://github.com/dropbox/dropbox-api-spec/blob/master/file_requests.stone),
and full-text [content search](https://help.dropbox.com/view-edit/search-content).
