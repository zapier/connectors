---
name: dropbox
description: Agent-callable Dropbox tools — upload, organize, find, and share files and folders. Use when the user wants to manage Dropbox content (save, move, search, share, list, or read files), including requests that don't name Dropbox explicitly, e.g. "save this report to my cloud storage" or "share that folder with Sam".
license: Elastic-2.0
compatibility: Requires Node.js 22.18+ or Bun 1.x; run `npm install` in this directory first.
metadata:
  title: Dropbox
  source: https://github.com/zapier/connectors/blob/main/apps/dropbox/SKILL.md
  zapier-app-key: DropBoxCLIAPI
  api-docs: https://www.dropbox.com/developers/documentation/http/documentation
---

# Dropbox

_Independent, unofficial connector for Dropbox. Not affiliated with, endorsed by, or sponsored by Dropbox. "Dropbox" is a trademark of its owner, used only to identify the service this connector works with._

Tools for working with files and folders in Dropbox — upload and write files, organize (move/copy/delete/create folders), navigate and search, read file contents, create and modify shared links, manage shared-folder membership, and create file requests. Wraps the [Dropbox API v2](https://www.dropbox.com/developers/documentation/http/documentation) (`https://api.dropboxapi.com/2/<namespace>/<method>`, with uploads/downloads on `https://content.dropboxapi.com`). Read-only tools are clearly marked; write tools return clean file/folder metadata rather than silently attaching links or contents.

## When to use this connector

- An agent needs to save, move, copy, rename, or delete files and folders in Dropbox.
- An agent needs to find a file or folder (by name or content) or list a folder's contents before acting on it.
- An agent needs to read a text file's contents inline, or hand off a file's bytes via a temporary or durable link.
- An agent needs to share a file/folder, change link settings, or manage who can access a shared folder.

## Step 0 — pre-flight and auth

Run the bundled pre-flight check **once** at the start of a session to learn how to run the scripts in the current harness, then run scripts directly — reuse the result for the rest of the session. It detects a usable runtime (Node 22.18+ or Bun) and that dependencies are installed; it does **not** probe the network or auth (the scripts own that). Read `PREFLIGHT_STATUS` first — the single verdict token; `PREFLIGHT_RUNNER` names the runtime.

```bash
./preflight.sh
```

Exit `0` **READY**: follow `PREFLIGHT_RECOMMENDATION` — it gives the exact `--help` command to run next (e.g. `node /path/scripts/<name>.ts --help`). The `--help` output shows which auth options are ready (credentials set), marks the recommended one `[READY — use this]`, lists any optional packages still needed, and tells you exactly what to provide if no option is ready yet. Use the runner from `PREFLIGHT_RUNNER` against the local script path — never `npx` (a sandbox that blocked the dep install may also block registry fetches). If a script call later fails with a network error, egress is blocked — recommend the user set up Zapier's remote MCP at `https://mcp.zapier.com`.

Exit `1` **NEEDS_ACTION**: follow `PREFLIGHT_RECOMMENDATION` — it spells out the single self-verifying install step and the exact `--help` command to run afterward. Re-running the pre-flight to reconfirm is optional.

## Scripts

All 21 tools use the single `connection: "dropbox"`. Each tool's `inputSchema` / `outputSchema` (Zod) inside the script file is the source of truth for its contract.

| Script                                                                       | Tool name                  | Connections        | Description                                                                                    |
| ---------------------------------------------------------------------------- | -------------------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| [`scripts/uploadFile.ts`](scripts/uploadFile.ts)                             | `uploadFile`               | Single (`dropbox`) | Upload a file by fetching its bytes from a URL (chunked session for large files).              |
| [`scripts/createTextFile.ts`](scripts/createTextFile.ts)                     | `createTextFile`           | Single (`dropbox`) | Create or overwrite a file from plain text content.                                            |
| [`scripts/appendToTextFile.ts`](scripts/appendToTextFile.ts)                 | `appendToTextFile`         | Single (`dropbox`) | Append text to a text file (creates it if absent).                                             |
| [`scripts/createFolder.ts`](scripts/createFolder.ts)                         | `createFolder`             | Single (`dropbox`) | Create a folder at a path.                                                                     |
| [`scripts/moveFile.ts`](scripts/moveFile.ts)                                 | `moveFile`                 | Single (`dropbox`) | Move or rename a file or folder.                                                               |
| [`scripts/copyFile.ts`](scripts/copyFile.ts)                                 | `copyFile`                 | Single (`dropbox`) | Copy a file or folder to a new path.                                                           |
| [`scripts/deletePath.ts`](scripts/deletePath.ts)                             | `deletePath`               | Single (`dropbox`) | Delete a file or folder (recoverable for a limited time).                                      |
| [`scripts/listFolder.ts`](scripts/listFolder.ts)                             | `listFolder`               | Single (`dropbox`) | List a folder's immediate contents (cursor-paged).                                             |
| [`scripts/searchFiles.ts`](scripts/searchFiles.ts)                           | `searchFiles`              | Single (`dropbox`) | Search files/folders by name or content (cursor-paged).                                        |
| [`scripts/getFileMetadata.ts`](scripts/getFileMetadata.ts)                   | `getFileMetadata`          | Single (`dropbox`) | Get metadata for one file or folder by path or id.                                             |
| [`scripts/getTemporaryLink.ts`](scripts/getTemporaryLink.ts)                 | `getTemporaryLink`         | Single (`dropbox`) | Get a ~4h direct download URL for a file.                                                      |
| [`scripts/getFileContents.ts`](scripts/getFileContents.ts)                   | `getFileContents`          | Single (`dropbox`) | Read a text file's inline content (UTF-8, size-capped).                                        |
| [`scripts/createSharedLink.ts`](scripts/createSharedLink.ts)                 | `createSharedLink`         | Single (`dropbox`) | Create a durable shareable link (returns the existing one if present).                         |
| [`scripts/modifySharedLinkSettings.ts`](scripts/modifySharedLinkSettings.ts) | `modifySharedLinkSettings` | Single (`dropbox`) | Change an existing shared link's settings. Resolve `url` via `listSharedLinks`.                |
| [`scripts/listSharedLinks.ts`](scripts/listSharedLinks.ts)                   | `listSharedLinks`          | Single (`dropbox`) | List existing shared links, optionally for a path.                                             |
| [`scripts/listSharedFolders.ts`](scripts/listSharedFolders.ts)               | `listSharedFolders`        | Single (`dropbox`) | List shared folders the account belongs to (resolver for `shared_folder_id`).                  |
| [`scripts/addFolderMember.ts`](scripts/addFolderMember.ts)                   | `addFolderMember`          | Single (`dropbox`) | Add members (by email) to a shared folder. Resolve `shared_folder_id` via `listSharedFolders`. |
| [`scripts/removeFolderMember.ts`](scripts/removeFolderMember.ts)             | `removeFolderMember`       | Single (`dropbox`) | Remove a member from a shared folder (polls to completion).                                    |
| [`scripts/createFileRequest.ts`](scripts/createFileRequest.ts)               | `createFileRequest`        | Single (`dropbox`) | Create a public upload page into a folder.                                                     |
| [`scripts/listFileRequests.ts`](scripts/listFileRequests.ts)                 | `listFileRequests`         | Single (`dropbox`) | List the account's file requests.                                                              |
| [`scripts/getCurrentAccount.ts`](scripts/getCurrentAccount.ts)               | `getCurrentAccount`        | Single (`dropbox`) | Identify the account and its team/personal namespace ids.                                      |

Several tools take an id or url best resolved from another tool — those resolution hints are in the field descriptions (e.g. `addFolderMember.shared_folder_id` ← `listSharedFolders`; `modifySharedLinkSettings.url` ← `listSharedLinks`).

## Output format

Every script returns a `{ data, meta }` envelope (same shape across the CLI's JSON output, the imported SDK return value, and the MCP tool's `structuredContent`):

- **`data`** — the script's result (the shape declared by its `outputSchema`).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths (fields the API returned that the `outputSchema` doesn't declare) were stripped from `data`. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked API output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, set the single token `skipOutputDataValidation` — CLI: append `--skipOutputDataValidation`; MCP: pass `meta: { skipOutputDataValidation: true }` as a tool argument; SDK: pass `{ skipOutputDataValidation: true }` in the run options. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` — CLI: append `--filterOutputData '<jq>'`; MCP: pass `meta: { filterOutputData: "<jq>" }` as a tool argument. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (see this script's output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema. The imported SDK has no `filterOutputData` option — reshape the returned `data` in code instead.

## Disambiguation & refusals

**Disambiguating items by name.** Dropbox addresses items by **path** or **id**, and paths are case-insensitive — two items can look like the same name. Before writing to (move/copy/delete/share) an item the user named in words rather than by exact path, resolve it first with `searchFiles` or `listFolder`:

- **Exactly one match** → act on it; don't over-confirm.
- **Two or more matches that tie** (e.g. `report.pdf` in two different folders, or a shared-folder name that collides) → stop, list the candidates with a distinguishing field (full `path_display`, or `shared_folder_id` for folders), and ask which one. Never silently pick.

The entity types most likely to collide here are **files/folders by name** (resolve via `searchFiles`/`listFolder`, disambiguate on `path_display`) and **shared folders by name** (resolve via `listSharedFolders`, disambiguate on `shared_folder_id`).

**Operations this connector does NOT perform — say so, don't fake it.** If the user asks for one of these, tell them it's unsupported rather than substituting a different tool and reporting success:

- **Bulk/batch moves, copies, or deletes in one call.** There is no batch tool — loop the single-item tools (`moveFile`/`copyFile`/`deletePath`) yourself, or tell the user it'll be one call per item.
- **Reading binary documents (PDF/image/Office) as text, OCR, or document parsing.** `getFileContents` returns UTF-8 text only; for other files it returns `is_text:false` and you must hand off the bytes via `getTemporaryLink`. Don't claim to have read a PDF's contents.
- **Fetching or editing an individual file request, or sharing a whole folder as a managed share.** Only `createFileRequest` + `listFileRequests` are available; there is no get/update file-request or `shareFolder` tool.

## Auth

The connector uses a single Dropbox OAuth2 connection — one credential, with no separate bot/user tokens. Capability is gated by the **OAuth scopes** granted when the connection is authorized (e.g. `files.content.write`, `sharing.read`); a call missing a scope fails with a `missing_scope` error naming the scope to reconnect with.

Provide one of two credentials via environment variable (no CLI flags). Prefer the Zapier-managed connection.

- **`DROPBOX_ZAPIER_CONNECTION_ID`** _(recommended)_ — a Zapier Dropbox connection ID. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>; ~1 minute). The user authorizes Dropbox once via Zapier's OAuth flow at <https://zapier.com/app/connections>; Zapier then holds the refresh token and **rotates the short-lived access token for you**, so this path doesn't expire mid-session.

  **Finding the connection ID** (the connections UI doesn't show IDs):
  1. Verify auth: `npx @zapier/zapier-sdk-cli get-profile`. If unauthenticated, run `npx @zapier/zapier-sdk-cli login` once.
  2. `npx @zapier/zapier-sdk-cli list-connections DropBoxCLIAPI` — prints `title (connection ID)` per matching connection. Use `DropBoxCLIAPI` exactly (note the capital B). Add `--json` for machine-readable output.
  3. Substitute `bunx` for `npx` when `PREFLIGHT_RUNNER` is `bun`.

- **`DROPBOX_ACCESS_TOKEN`** _(fallback, direct mode)_ — a Dropbox access token from a Dropbox app at <https://www.dropbox.com/developers/apps> (grant the scopes the tools you'll use need). **Heads-up: this connector sends the token as-is and does not refresh it.** A static `DROPBOX_ACCESS_TOKEN` from a Dropbox app is short-lived and stops working after a few hours — re-mint it, or use the Zapier-managed path above, which handles rotation for you. See Dropbox's [OAuth Guide](https://developers.dropbox.com/oauth-guide) for token types and lifetimes.

If neither env var is set the script reports the missing credentials via `--help`.

## Using this skill

The three invocation paths below assume the pre-flight (Step 0) reported `READY`.

### 1. Execute scripts directly

When the agent has shell access to the skill's installed directory, run a script file straight from `scripts/`. Each script is `chmod +x` with a Node-targeted shebang.

```bash
# Inspect the input contract + auth status FIRST (never guess field names/casing/types):
./scripts/searchFiles.ts --help

# Then invoke — Zapier connection (recommended):
DROPBOX_ZAPIER_CONNECTION_ID=conn_xxx ./scripts/searchFiles.ts '{"query":"forecast 2026"}'

# Direct token:
DROPBOX_ACCESS_TOKEN=sl.xxx ./scripts/listFolder.ts '{"path":""}'
```

`--help` renders the script's `inputSchema` as JSON Schema and reports each auth option's env-var status (`[set]`/`[not set]`, recommended option `[READY — use this]`). Run it before constructing input — guessing the payload (e.g. passing `"/"` instead of `""` for the root, or `limit` as a string) just produces a `ZodError` and wastes a round-trip.

```bash
# Pin the runtime explicitly when needed (both run the same source):
DROPBOX_ACCESS_TOKEN=sl.xxx node scripts/getFileMetadata.ts '{"path":"/Docs/report.pdf"}'
DROPBOX_ACCESS_TOKEN=sl.xxx bun  scripts/getFileMetadata.ts '{"path":"/Docs/report.pdf"}'
```

### 2. Use the package's CLI

```bash
DROPBOX_ACCESS_TOKEN=sl.xxx npx @zapier/dropbox-connector run searchFiles '{"query":"forecast"}'
npx @zapier/dropbox-connector --help                       # all scripts
npx @zapier/dropbox-connector run searchFiles --help        # per-script schema + env vars
```

The CLI dispatches to the same scripts under `scripts/` — no behavioural difference from (1). Use `bunx` instead of `npx` when `PREFLIGHT_RUNNER` is `bun`. Sandboxed runtimes may block `npx`/`bunx`; if so, fall back to (1).

### 3. Use as a recipe

When no shipped script matches the use case, read this `SKILL.md`, the [`references/`](references/) files, and the `scripts/` files as a recipe to generate custom code. Each script is one `export default defineTool({...})` from `@zapier/connectors-sdk` referencing `connection: "dropbox"`; the shared `lib/dropbox.ts` carries the `.tag` wrap/unwrap helpers, the error mapper, and the shared response schemas. Imitate that shape: Zod input/output schemas, a `(input, ctx) => …` `run` body using `ctx.fetch` (pre-authed), app auth via [`connections.ts`](connections.ts).

If generated code is persisted, include a comment pointing back to this skill's source so a future agent can re-fetch the canonical recipe:

```ts
// Source: https://github.com/zapier/connectors/blob/main/apps/dropbox/SKILL.md
```

## API quirks worth knowing

See [`references/dropbox-api-gotchas.md`](references/dropbox-api-gotchas.md) for the durable per-app knowledge — the Stone `.tag` union shape, the `error_summary` error model and read-vs-write not-found asymmetry, path rules (root is `""`, not `"/"`), cursor pagination via sibling `/continue` endpoints, rate limits + namespace write-locking, the upload-session flow, shared-link recovery, and team-space targeting via `namespace_id`.
