# Dropbox API — durable per-app knowledge

Patterns and quirks worth knowing when calling the [Dropbox API v2](https://www.dropbox.com/developers/documentation/http/documentation) from an agent. Dropbox's HTTP API is generated from the Stone IDL, so its wire shapes (unions, error envelopes, content endpoints) are unusually regular but also unusually verbose. This connector smooths most of that over; this file explains what's underneath so you can reason about edge cases. Agents that hit a new one in flight should append to this file.

JSON calls go to `https://api.dropboxapi.com/2/<namespace>/<method>` (always `POST`); upload/download bytes go to `https://content.dropboxapi.com/2/...`.

## 1. Auth & identity

Dropbox uses OAuth2 with **short-lived access tokens plus a long-lived refresh token**. There is one token, one identity — no bot/user split. Access tokens are prefixed `sl.` and expire in ~4 hours (`expires_in: 14400`). To receive a refresh token the authorize flow must set `token_access_type=offline`; refresh tokens do not expire unless revoked. PKCE (`S256`) is supported for public clients. Dropbox stopped issuing long-lived tokens on **2021-09-30**, so refresh handling is mandatory.

Under Zapier-managed auth the connection layer holds the refresh token and rotates the short-lived access token transparently — the connector just sends whatever bearer it's handed. With a static `DROPBOX_ACCESS_TOKEN`, expect a ~4h lifetime unless you supply refresh credentials.

Capability is gated by **OAuth scopes** granted at connect time, not by token type. Scopes follow `<resource>.<read|write>`:

| Scope                 | Enables                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------- |
| `account_info.read`   | `getCurrentAccount`                                                                     |
| `files.metadata.read` | `getFileMetadata`, `listFolder`, `searchFiles`                                          |
| `files.content.read`  | `getTemporaryLink`, `getFileContents`                                                   |
| `files.content.write` | uploads, `createFolder`, `moveFile`, `copyFile`, `deletePath`                           |
| `sharing.read`        | `listSharedLinks`, `listSharedFolders`                                                  |
| `sharing.write`       | `createSharedLink`, `modifySharedLinkSettings`, `addFolderMember`, `removeFolderMember` |
| `file_requests.read`  | `listFileRequests`                                                                      |
| `file_requests.write` | `createFileRequest`                                                                     |

A call whose token lacks the scope fails with `AuthError` `missing_scope`, and the body names the scope it wanted:

```json
{
  "error_summary": "missing_scope/..",
  "error": { ".tag": "missing_scope", "required_scope": "files.content.read" }
}
```

Recommended response: tell the user to reconnect Dropbox granting the named permission. This is terminal — retrying won't help.

## 2. Error shape

Errors come back as HTTP 4xx (often `409 Conflict` for endpoint-specific errors) with a JSON body carrying both a flat `error_summary` string and a nested `.tag` union:

```json
{
  "error_summary": "path/not_found/",
  "error": { ".tag": "path", "path": { ".tag": "not_found" } }
}
```

Match on the `error_summary` prefix. The load-bearing mappings:

| `error_summary` prefix                                             | Meaning / response                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `path/not_found`, `path_lookup/not_found`, `from_lookup/not_found` | Item missing at that path. Verify with `getFileMetadata`.          |
| `path/malformed_path`                                              | Bad path — must start with `/` (root is `""`, never `"/"`).        |
| `path/conflict`                                                    | Item already exists. Pass `autorename: true` or pick another path. |
| `path/insufficient_space`                                          | Out of Dropbox storage. Terminal.                                  |
| `shared_link_already_exists`                                       | Soft success — fetch the existing link (see §8).                   |
| `too_many_write_operations`                                        | Retriable — namespace write contention; back off.                  |
| `too_many_requests` (429)                                          | Retriable — honor `Retry-After`.                                   |
| `missing_scope`                                                    | Terminal — reconnect with the named scope.                         |
| `invalid_grant` / 401                                              | Terminal — connection expired, reconnect.                          |

**Read-vs-write not-found asymmetry.** This trips people up: read ops (`get_metadata`, `download`) wrap a missing item as `path/not_found`, but **relocation/delete ops** (`move_v2`, `copy_v2`, `delete_v2`) wrap the _same_ condition as `path_lookup/not_found` (and the source side of a move/copy as `from_lookup/not_found`). Any "does this path exist?" matcher must check **all three** prefixes, not just `path/`.

**Retriable vs terminal.** Retriable: `too_many_requests`, `too_many_write_operations`, and 5xx. Everything else is terminal — `invalid_grant`, `missing_scope`, `path/not_found`, `malformed_path`, `insufficient_space`. Don't burn retries on terminal errors.

## 3. The Stone union (`.tag`) shape

Because the API is generated from Stone, **every enum and union serializes with a `.tag` discriminator** on both sides of the wire. This connector hides it — you pass plain strings and read a clean `type` field — but you'll see it in raw responses and error bodies.

On the **request** side, what looks like an enum string is wrapped on the wire:

```json
{
  "mode": { ".tag": "overwrite" },
  "requested_visibility": { ".tag": "public" }
}
```

Wrapped request enums include `mode`, `requested_visibility`, `audience`, `access`, `access_level`, `file_status`, and `file_categories` (an array of `{ ".tag": "pdf" }`). A folder-member is a wrapped union too — an email travels as `{ ".tag": "email", "email": "user@example.com" }`. You supply the plain values (`mode: "overwrite"`, `members: ["user@example.com"]`); the wrapping happens for you.

On the **response** side, file/folder metadata and link objects carry a `.tag` discriminator naming the variant:

```json
{
  ".tag": "file",
  "name": "report.pdf",
  "id": "id:abc",
  "path_lower": "/report.pdf"
}
```

This connector surfaces that discriminator as a plain **`type`** field (`"file"`, `"folder"`, or `"deleted"`), since `.tag` isn't a usable identifier. So you read `entry.type`, never `entry[".tag"]`.

## 4. Path & identifier model

Items are addressed three ways, and any tool taking a `path` accepts all three:

- **Path** — `/Documents/report.pdf`. Non-root paths must start with `/`.
- **Id** — `id:abc123`. Stable across moves/renames; returned as the `id` field. Prefer this when you'll act on an item later.
- **Rev** — `rev:` followed by ≥9 hex chars. A pointer to a specific _content revision_.

**The account root is the empty string `""`, never `"/"`.** Passing `"/"` to `listFolder` returns HTTP 400 ("Specify the root folder as an empty string rather than as `/`"). This is the single most common path mistake.

Paths are **case-insensitive but case-preserving**. Responses give you two forms:

- `path_lower` — the stable, lowercased key. **Match and dedupe on this.**
- `path_display` — original casing, for showing the user. Only the **last component** is guaranteed to reflect real casing; parent segments may be stale.

Trailing or double slashes, or otherwise bad characters, produce `path/malformed_path`. Each path component is limited to ~255 characters; the full path tops out near the ~260-char Windows-heritage ceiling. A namespace can also be addressed directly as `ns:<namespace_id>` (rare; team-space targeting normally uses the path-root header — see §12).

## 5. Files — upload flow

Uploads and downloads use the **content endpoints** on `content.dropboxapi.com`, which work differently from the JSON endpoints: the JSON arguments ride in a **`Dropbox-API-Arg` header** (ASCII-escaped) and the file bytes go in the raw request body. On download, the bytes come back in the body and the file metadata comes back in a **`Dropbox-API-Result` header**.

Two upload paths depending on size:

- **Single request** (`files/upload`) for payloads **≤150 MiB** — one POST, bytes in the body.
- **Upload session** (`files/upload_session/start` → `append_v2` → `finish`) for anything larger. Chunks must be **multiples of 4 MiB** (except the last, which closes the session). A session lives ~48h; total upload caps at **350 GB**.

The write behavior is the `WriteMode` union:

| `mode`          | Behavior                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `add` (default) | Keep both on conflict (saves a numbered copy if `autorename`, else `path/conflict`).                                                |
| `overwrite`     | Replace whatever's there.                                                                                                           |
| `update:<rev>`  | Optimistic concurrency — write only if the file is still at `<rev>`; a mismatch produces a "conflicted copy" instead of clobbering. |

`autorename: true` turns a conflict into a numbered variant (`report (1).pdf`) rather than an error. There is also a `strict_conflict` flag that makes `add` treat identical-content uploads as conflicts too.

**There is no native append.** `appendToTextFile` emulates it with a read-modify-write: fetch the current `rev` via `get_metadata`, download the bytes, concatenate the new text, and re-upload with `mode: update:<rev>`. The `update` rev guard means a concurrent writer produces a conflicted copy rather than silent data loss.

## 6. Pagination

`listFolder`, `searchFiles`, `listSharedLinks`, `listSharedFolders`, and `listFileRequests` are cursor-paginated, with one Dropbox quirk: the **first page** hits the base endpoint, but the **next page** hits a _separate_ sibling endpoint with a cursor-only body:

| First call              | Continuation                    |
| ----------------------- | ------------------------------- |
| `files/list_folder`     | `files/list_folder/continue`    |
| `files/search_v2`       | `files/search/continue_v2`      |
| `sharing/list_folders`  | `sharing/list_folders/continue` |
| `file_requests/list_v2` | `file_requests/list/continue`   |

This connector hides that — you pass `cursor` back into the same tool and it routes to the right endpoint. Each response carries `cursor` + `has_more`; keep calling with the cursor while `has_more` is true. The connector does **not** auto-paginate, so a single call returns one page — fetch the rest yourself if you need them.

Default/max `limit`: `list_folder` defaults vary but caps at **2000**; `search_v2` caps at **1000**. A `list_folder/continue` cursor can be invalidated server-side (a `reset` error), meaning the folder changed underneath you — restart the listing from page one when you see it.

## 7. Rate limits & namespace locking

A 429 carries a `Retry-After` header (seconds) and the body echoes `retry_after` (default 1). There are two distinct throttles:

- **`too_many_requests`** — per-user request-burst limit. Slow down overall.
- **`too_many_write_operations`** — namespace **write-lock** contention. Each namespace (a user's root, a shared folder, or a team folder) is a single lock, and writes to the same namespace **serialize**. Two parallel writes into the same folder will make one of them throttle.

Both are retriable. The practical guidance: **don't parallelize writes into the same folder** — issue them sequentially. For unrelated folders, parallelism is fine. On either error, wait the `Retry-After` interval (with jitter) and retry.

## 8. Sharing model

Create links with **`sharing/create_shared_link_with_settings`**. The older `sharing/create_shared_link` is deprecated — don't use it.

**Already-exists is a soft success.** If a link for the path already exists, creation fails with `shared_link_already_exists` — and the error's attached link metadata is **frequently null**, so you can't read it off the error. The recovery (which this connector does automatically) is to fall back to `sharing/list_shared_links(path, direct_only=true)` and return the existing link. Either way you get a usable link; treat this as success, not failure.

Link settings, several of which require a **paid plan** (a forbidden one fails with `settings_error`):

| Setting                | Values                                          | Paid?                             |
| ---------------------- | ----------------------------------------------- | --------------------------------- |
| `requested_visibility` | `public`, `team_only`, `password`               | `password`/`team_only` often paid |
| `link_password`        | string (required when visibility is `password`) | paid                              |
| `expires`              | ISO-8601 datetime                               | paid                              |
| `audience`             | `public`, `team`, `no_one`                      | varies                            |
| `access`               | `viewer`, `editor`, `max`, `default`            | `editor` paid                     |
| `allow_download`       | boolean                                         | —                                 |

**Download URL transform.** A shared link's default URL ends in `?dl=0` (a preview page). To get a direct-download URL, flip it to `?dl=1`. This connector adds that as `url_download` on link responses for files.

**Shared-folder membership.** `addFolderMember` adds people by email at an `access_level` (`editor`/`viewer`/`viewer_no_comment`/`traverse`); `removeFolderMember` removes one. Removal is **asynchronous** (see §11) — this connector polls it to a confirmed result. Resolve the `shared_folder_id` from `listSharedFolders`.

## 9. Search specifics

Use **`files/search_v2`** (with `files/search/continue_v2` for paging). The v1 `files/search` was retired in 2021.

Two wire shapes to be aware of (the connector normalizes both):

- Most inputs nest under an **`options`** object on the wire — notably `limit` becomes `options.max_results`, and `file_status`/`file_categories` are `.tag`-wrapped there.
- Matches are **double-nested**: `matches[].metadata.metadata` is the actual entry. This connector flattens it to a clean `matches[]` array of entries.

Inputs: `query` (required), optional `path` to scope to a folder, `file_status` (`active`/`deleted`), `filename_only`, `file_extensions` (e.g. `["pdf","docx"]`), and `file_categories` (`image`/`document`/`pdf`/`spreadsheet`/`presentation`/`audio`/`video`/`folder`/`paper`/`others`).

**Full-text content search requires a paid plan.** On a Basic account, `filename_only: false` silently matches _names only_ — no error, just narrower results. If content search seems to miss, the account plan is the likely cause. There's also a ceiling around **10,000 matches** across all pages; beyond that, narrow the query.

## 10. File requests

A file request is a **public upload page** that lets people without a Dropbox account drop files into one of your folders. `file_requests/create` makes one; `file_requests/list_v2` (+ `/list/continue`) lists them; `file_requests/get` fetches one by id.

Inputs: `title` (shown on the page), `destination` (an **existing** folder path — it won't be created), optional `description`, optional `deadline`, and `open` (whether it accepts uploads now). The response field `is_open` reflects state; the request input is `open` — same concept, different names.

`deadline` (and `allow_late_uploads`) require a **paid plan**. On a Basic account, setting a deadline fails with `invalid_account_type/feature` — map this to "deadlines require a paid Dropbox plan" and retry without the deadline.

## 11. Async jobs

Some operations don't complete inline — they return a `LaunchResultBase` union that's either `{ ".tag": "complete", ... }` (done now) or `{ ".tag": "async_job_id", "async_job_id": "<id>" }`. For an async job you then poll a sibling `/check` endpoint until it reports `complete` or `failed` (the failure carries a `PollError`/operation-specific reason tag).

**Single-item operations are synchronous** — `move_v2`, `copy_v2`, and `delete_v2` return their result inline, no polling. The async pattern shows up for **batch variants** (excluded from this connector), `share_folder`, and **`remove_folder_member`**. For `removeFolderMember`, this connector polls `sharing/check_remove_member_job_status` to completion and returns a confirmed `{ shared_folder_id, member, removed: true }` (throwing on `failed`) — so you get a real result, not a dangling job id.

## 12. Account & namespaces

`users/get_current_account` returns a `FullAccount` — `account_id`, `email`, `name`, `account_type`, and team info. This connector flattens it and derives `is_team`. It's the "who am I / which Dropbox am I in" resolver — reach for it first when you're unsure of identity or which space you're operating in.

Crucially it surfaces `root_info`: a member's **root namespace** (the team space, for team members) versus their **home namespace** (personal), plus `home_path`. For a personal account the two are the same; for a team member they differ, and that distinction is what team-space targeting hinges on.

**Targeting a namespace.** By default a request operates in the member's _home_ space. To act inside the team space (or any reachable namespace) set the **`Dropbox-API-Path-Root`** header. It's a union with three modes:

```json
{ ".tag": "namespace_id", "namespace_id": "<id>" }   // a specific namespace
{ ".tag": "root" }                                     // the account root
{ ".tag": "home" }                                     // home (the default; omit the header)
```

This connector exposes an optional `namespace_id` input on every path tool and builds the header for you; resolve the id from `getCurrentAccount` (`root_namespace_id` = team space, `home_namespace_id` = personal). A wrong or inaccessible namespace returns HTTP **422 `PathRootError`** (`invalid_root` / `no_permission`) — surface as "that Dropbox space isn't accessible — check the namespace id from getCurrentAccount." Personal-account users just omit it.

## 13. Versioning & platform direction

Dropbox has steadily retired older surfaces; always prefer the modern `_v2` variants:

- The original `/1/` API was **retired in 2017** — v2 (`/2/`) only.
- `files/search` v1 was **retired in 2021** → use `files/search_v2`.
- `sharing/create_shared_link` is **deprecated** → use `create_shared_link_with_settings`.
- In general, prefer the `_v2` / `append_v2` / `list_v2` / `move_v2` / `copy_v2` / `delete_v2` / `create_folder_v2` forms over their unsuffixed predecessors — the bare versions are legacy and may differ in response shape (the `_v2` relocation ops, for instance, wrap their result in a `{ "metadata": ... }` envelope this connector unwraps).
