# Using Dropbox by writing your own code

This is the write-your-own-code shape: you have no pre-registered tools, no
terminal/subprocess access, and can't `import` this package in-process (for
example, a code-execution sandbox that must write and run a snippet that
calls the Dropbox API directly). This reference teaches you enough of the
request/response mechanics — derived from this connector's own 21 scripts —
to write equivalent calls yourself. It does not use this connector's runtime
at all; treat it as a map of "what HTTP calls to make," not "how to invoke
this package."

Vendor-behavior facts (path rules, error semantics, rate limits, pagination,
plan-gating, etc.) are **not restated here** — they're cited with sources in
[`dropbox-api-gotchas.md`](dropbox-api-gotchas.md). Read that file for the
"why"; this file is the "what shape."

## Auth & base URLs

Two base URLs, both POST-only:

- **RPC base** — `https://api.dropboxapi.com` — most operations: metadata,
  listing, search, sharing, file requests, account info.
- **Content base** — `https://content.dropboxapi.com` — the few operations
  that move file bytes: upload and download.

Every call needs `Authorization: Bearer <access_token>` (standard OAuth2
bearer auth — see Dropbox's own [OAuth Guide](https://developers.dropbox.com/oauth-guide)
for how to mint a token and which scopes gate which calls; scope/token
error behavior is cited in `dropbox-api-gotchas.md`'s Rate limits & write
serialization section).

- **RPC endpoints**: `Content-Type: application/json`, arguments as the JSON
  request body.
- **Content endpoints**: no JSON body for arguments — instead a
  `Dropbox-API-Arg` request header carrying the JSON-encoded arguments, and
  the raw bytes as the request body (upload) or response body (download).
  The response's metadata for a download comes back in a
  `Dropbox-API-Result` response header, not the body. See
  `dropbox-api-gotchas.md`'s "Content endpoints" section for the header's
  ASCII-safety requirement and size ceilings.
- **Team-namespace targeting**: add a `Dropbox-API-Path-Root` header (both
  endpoint families) when you need to act relative to a namespace other than
  the default. See `dropbox-api-gotchas.md`'s "Team spaces & namespaces"
  section.

## The `.tag` wire convention

Request/response shapes below show enum-valued fields as plain `<enum>` —
on the wire Dropbox encodes these as tagged objects, e.g. a field typed
`<enum>` with chosen value goes out as `{ ".tag": "<value>" }` rather than a
bare string, and tagged response objects (file vs. folder entries, error
bodies, path-root, etc.) carry a `.tag` you branch on. The rule itself (why,
and where it shows up) is cited in `dropbox-api-gotchas.md`'s "The Stone
`.tag` wire format" section — this file only tells you _which_ fields are
tagged.

## Request/response shapes by operation family

Field names/types below are read directly off this connector's own
`scripts/*.ts` input/output schemas (mechanism, not vendor behavior). Exact
enum member lists and numeric limits are Dropbox's own behavior, not
reproduced here — resolve them from Dropbox's HTTP API reference for the
given endpoint, or from `dropbox-api-gotchas.md` where a fact is already
covered there.

### Account identity

- `POST {rpc}/2/users/get_current_account` — no body.
  → `{ account_id: string, email: string, name: { display_name: string }, country?: string, account_type?: { ".tag": <enum> }, team?: { name: string } | null, root_info?: { root_namespace_id?: string, home_namespace_id?: string, home_path?: string } }`.

### Listing & finding

- `POST {rpc}/2/files/list_folder` — `{ path: string, recursive?: boolean, limit?: number, include_deleted?: boolean }`.
  Continuation: `POST {rpc}/2/files/list_folder/continue` — `{ cursor: string }` (no other fields; a continuation call ignores everything else).
  → `{ entries: Entry[], cursor?: string, has_more: boolean }`.
- `POST {rpc}/2/files/get_metadata` — `{ path: string, include_deleted?: boolean }`.
  → an `Entry` directly (no wrapper object).
- `POST {rpc}/2/files/search_v2` — `{ query: string, options: { path?: string, max_results: number, file_status?: <enum>, filename_only?: boolean, file_extensions?: string[], file_categories?: <enum>[] } }`.
  Continuation: `POST {rpc}/2/files/search/continue_v2` — `{ cursor: string }`.
  → `{ matches: [{ metadata: { metadata: Entry } }], cursor?: string, has_more: boolean }` — note the double
  nesting: each match wraps a metadata union around the actual tagged `Entry`, so you unwrap twice
  (`match.metadata.metadata`) to reach the entry fields.

An `Entry` (file/folder/deleted) is a tagged object; common fields across
the tag: `.tag: <enum>`, `name: string`, `path_lower?: string`,
`path_display?: string`, `id?: string`, `size?: number`, `rev?: string`,
`client_modified?: string`, `server_modified?: string`,
`content_hash?: string`.

### Reading & downloading bytes

- `POST {content}/2/files/download` — no JSON body; `Dropbox-API-Arg: { path: string }` header.
  → response body = raw file bytes; `Dropbox-API-Result` header (JSON) = `{ name: string, path_display?: string, rev?: string, size?: number }`.
- `POST {rpc}/2/files/get_temporary_link` — `{ path: string }`.
  → `{ link: string, metadata?: { name?: string, path_display?: string, id?: string, size?: number } }`.

### Creating & writing

- `POST {rpc}/2/files/create_folder_v2` — `{ path: string, autorename?: boolean }`.
  → `{ metadata: Entry }`.
- `POST {content}/2/files/upload` — no JSON body; `Dropbox-API-Arg: { path: string, mode: <enum> | { ".tag": "update", update: string }, autorename: boolean }` header; request body = raw bytes.
  → an `Entry` directly (no `{ metadata: ... }` wrapper — this endpoint's success shape differs from the `_v2` RPC calls above).
- **Chunked upload session** (for files past the single-request size ceiling — see `dropbox-api-gotchas.md`'s "Content endpoints" section for that number):
  1. `POST {content}/2/files/upload_session/start` — `Dropbox-API-Arg: {}` header, body = first chunk of bytes. → `{ session_id: string }`.
  2. `POST {content}/2/files/upload_session/append_v2` — `Dropbox-API-Arg: { cursor: { session_id: string, offset: number }, close: boolean }` header, body = next chunk of bytes. → empty body on success.
  3. Repeat step 2 for each middle chunk (`offset` advances by the chunk length each time).
  4. `POST {content}/2/files/upload_session/finish` — `Dropbox-API-Arg: { cursor: { session_id: string, offset: number }, commit: { path: string, mode: <enum>, autorename: boolean } }` header, body = the final remaining bytes.
     → an `Entry` directly.
     (Chunk-size and session-length constraints are Dropbox's own — check Dropbox's upload-session documentation for the exact numbers before choosing a chunk size.)
- A read-modify-write "append" (Dropbox has no native append endpoint) is: `get_metadata` to learn the current `rev` (or detect not-found), `download` the existing bytes if present, concatenate, then re-`upload` with `mode: { ".tag": "update", update: <rev> }` if updating an existing file or `mode: <enum "add">` if creating fresh.

### Moving, copying, deleting

- `POST {rpc}/2/files/move_v2` — `{ from_path: string, to_path: string, autorename?: boolean, allow_ownership_transfer?: boolean }`. → `{ metadata: Entry }`.
- `POST {rpc}/2/files/copy_v2` — `{ from_path: string, to_path: string, autorename?: boolean }`. → `{ metadata: Entry }`.
- `POST {rpc}/2/files/delete_v2` — `{ path: string }`. → `{ metadata: Entry }`.

### Shared links

- `POST {rpc}/2/sharing/create_shared_link_with_settings` — `{ path: string, settings?: { requested_visibility?: <enum>, link_password?: string, expires?: string } }`.
  → a tagged `SharedLinkMetadata` object (`.tag`, `url: string`, `name?: string`, `path_lower?: string`, plus visibility/expiry fields per settings passed).
  If the call fails with an `error_summary` prefixed `shared_link_already_exists` (see Error handling below), recover by calling `list_shared_links` for the same path and using the first result instead of treating it as a hard failure.
- `POST {rpc}/2/sharing/list_shared_links` — `{ path?: string, direct_only?: boolean }`, or `{ cursor: string }` for a continuation (mutually exclusive with the filter fields).
  → `{ links: SharedLinkMetadata[], cursor?: string, has_more?: boolean }`.
- `POST {rpc}/2/sharing/modify_shared_link_settings` — `{ url: string, settings?: { requested_visibility?: <enum>, link_password?: string, expires?: string, audience?: <enum>, access?: <enum>, allow_download?: boolean }, remove_expiration?: boolean }`.
  Note `remove_expiration` is a **top-level** field, not nested inside `settings`, and is mutually exclusive with `settings.expires`.
  → `SharedLinkMetadata`.

### Shared-folder membership

- `POST {rpc}/2/sharing/list_folders` — `{ limit?: number }`; continuation `POST {rpc}/2/sharing/list_folders/continue` — `{ cursor: string }`.
  → `{ entries: [{ shared_folder_id: string, name: string, path_lower?: string, access_type?: <enum> }], cursor?: string }`.
- `POST {rpc}/2/sharing/add_folder_member` — `{ shared_folder_id: string, members: [{ member: { ".tag": "email", email: string }, access_level: <enum> }], quiet?: boolean, custom_message?: string }`.
  → empty body on success.
- `POST {rpc}/2/sharing/remove_folder_member` — `{ shared_folder_id: string, member: { ".tag": "email", email: string }, leave_a_copy?: boolean }`.
  → a `LaunchResultBase`: either `{ ".tag": "complete" }` (done) or `{ ".tag": "async_job_id", async_job_id: string }` (poll it — see Async jobs below).

### File requests

- `POST {rpc}/2/file_requests/create` — `{ title: string, destination: string, description?: string, deadline?: { deadline: string }, open?: boolean }`.
  → a `FileRequest` object directly (no `.tag`, no wrapper): `{ id: string, url: string, title: string, destination: string, is_open: boolean, file_count: number, ... }`.
- `POST {rpc}/2/file_requests/list_v2` — `{ limit?: number }`; continuation `POST {rpc}/2/file_requests/list/continue` — `{ cursor: string }`.
  → `{ file_requests: FileRequest[], cursor?: string, has_more?: boolean }`.

## Error handling pattern

A non-2xx response body is JSON. Parse it and branch on it rather than only
the status code — the envelope shape (`error_summary` + tagged `error`) and
what each status code / summary prefix means is cited in
`dropbox-api-gotchas.md`'s "Error model" and "Rate limits & write
serialization" sections; match `error_summary` by **prefix**, per that same
section, not exact equality.

A resilient version of this in your own code looks like:

```
async function callDropbox(url, init) {
  const res = await fetch(url, init);
  if (res.ok) return res;
  const body = await res.json().catch(() => ({}));
  const summary = body.error_summary ?? "";
  const err = new Error(`Dropbox error (${res.status}): ${summary}`);
  err.status = res.status;
  err.summary = summary;
  err.body = body;
  throw err;
}
```

Then check prefixes with `err.summary.startsWith("path/not_found")`,
`err.summary.startsWith("shared_link_already_exists")`, etc., to decide
whether an error is expected/recoverable (see the "not-found is the create
path" append pattern above, and the shared-link-already-exists recovery
above) versus a real failure to surface.

One asymmetry worth coding for explicitly: for the content-download
endpoint, a failure still comes back as a JSON error body (not raw file
bytes) — check `res.ok` before treating the body as file content or reading
the `Dropbox-API-Result` header.

## Async jobs

A handful of operations (this connector's code shows it for shared-folder
member removal) don't complete synchronously — the initiating call returns
a tagged result that's either already `complete` or an `async_job_id` to
poll. The pattern:

1. Call the operation. If the result's `.tag` is `complete` (or there's no
   `async_job_id`), you're done.
2. Otherwise, poll a sibling `check_*_job_status` endpoint (for folder-member
   removal: `POST {rpc}/2/sharing/check_remove_member_job_status` with
   `{ async_job_id: string }`) on an interval, inspecting the returned
   `.tag`: keep polling on anything other than `complete`/`failed`, return
   success on `complete`, and raise on `failed` (using the accompanying
   `failed` detail as the error message).
3. Cap the number of poll attempts and raise a clear "still running" error
   if you exceed it, rather than polling forever.

## Where to go next

- **Path formats, id-vs-path, `path_lower`/`path_display`, timestamps** — [dropbox-api-gotchas.md § Paths & identifiers](dropbox-api-gotchas.md#paths--identifiers).
- **The `.tag` wire convention in full** — [dropbox-api-gotchas.md § The Stone `.tag` wire format](dropbox-api-gotchas.md#the-stone-tag-wire-format).
- **Error envelope, status codes, prefix matching** — [dropbox-api-gotchas.md § Error model](dropbox-api-gotchas.md#error-model).
- **Rate limits, `Retry-After`, scope errors** — [dropbox-api-gotchas.md § Rate limits & write serialization](dropbox-api-gotchas.md#rate-limits--write-serialization).
- **Team/namespace targeting and its errors** — [dropbox-api-gotchas.md § Team spaces & namespaces](dropbox-api-gotchas.md#team-spaces--namespaces).
- **Content-endpoint header encoding and size ceilings** — [dropbox-api-gotchas.md § Content endpoints (upload / download)](dropbox-api-gotchas.md#content-endpoints-upload--download).
- **Cursor pagination and page-size ceilings** — [dropbox-api-gotchas.md § Pagination (cursor-based, no auto-paging)](dropbox-api-gotchas.md#pagination-cursor-based-no-auto-paging).
- **Write modes, autorename, move/rename, delete retention** — [dropbox-api-gotchas.md § Writes, conflicts, move/rename, delete](dropbox-api-gotchas.md#writes-conflicts-moverename-delete).
- **Shared-link visibility/access semantics, `dl=` params, plan gating** — [dropbox-api-gotchas.md § Shared links](dropbox-api-gotchas.md#shared-links).
- **File-request semantics and plan gating** — [dropbox-api-gotchas.md § File requests](dropbox-api-gotchas.md#file-requests).
- **Search plan gating and field scope** — [dropbox-api-gotchas.md § Search](dropbox-api-gotchas.md#search).
- **Account fields** — [dropbox-api-gotchas.md § Account](dropbox-api-gotchas.md#account).
- **Which features need a paid plan, at a glance** — [dropbox-api-gotchas.md § Paid-plan-gated features (quick reference)](dropbox-api-gotchas.md#paid-plan-gated-features-quick-reference).
