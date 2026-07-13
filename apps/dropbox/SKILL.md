---
name: dropbox
description: Agent-callable Dropbox tools — upload, organize, find, and share files and folders. Use when the user wants to manage Dropbox content (save, move, search, share, list, or read files), including requests that don't name Dropbox explicitly, e.g. "save this report to my cloud storage" or "share that folder with Sam".
license: Elastic-2.0
compatibility: Run `npm install` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for prebuilt / alternative-runtime options.
metadata:
  title: Dropbox
  source: https://github.com/zapier/connectors/blob/main/apps/dropbox/SKILL.md
  zapier-app-key: DropBoxCLIAPI
  api-docs: https://www.dropbox.com/developers/documentation/http/documentation
---

# Dropbox

_Independent, unofficial connector for Dropbox. Not affiliated with, endorsed by, or sponsored by Dropbox. "Dropbox" is a trademark of its owner, used only to identify the service this connector works with._

Tools for working with files and folders in Dropbox — upload and write files, organize (move/copy/delete/create folders), navigate and search, read file contents, create and modify shared links, manage shared-folder membership, and create file requests. Wraps the [Dropbox API v2](https://www.dropbox.com/developers/documentation/http/documentation) (`https://api.dropboxapi.com/2/<namespace>/<method>`, with uploads/downloads on `https://content.dropboxapi.com`). Read-only tools are clearly marked; write tools return clean file/folder metadata rather than silently attaching links or contents.

## When to use this

- An agent needs to save, move, copy, rename, or delete files and folders in Dropbox.
- An agent needs to find a file or folder (by name or content) or list a folder's contents before acting on it.
- An agent needs to read a text file's contents inline, or hand off a file's bytes via a temporary or durable link.
- An agent needs to share a file/folder, change link settings, or manage who can access a shared folder.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill dropbox` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                         | Load                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__dropbox__<tool>`), or you can register a local server yourself (or guide the user to) | [`references/use-as-mcp.md`](references/use-as-mcp.md) |
| Terminal / subprocess access (you can run `node`)                                                                                                   | [`references/use-as-cli.md`](references/use-as-cli.md) |
| Only your own code, importing this package as a dependency                                                                                          | [`references/use-as-sdk.md`](references/use-as-sdk.md) |

## Scripts

All 21 scripts use the single `dropbox` connection. Each script's `inputSchema` / `outputSchema` (Zod) inside the script file is the source of truth for its contract.

| Script                                                                       | Script name                | Connections        | Description                                                                                    |
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

Several scripts take an id or url best resolved from another script — those resolution hints are in the field descriptions (e.g. `addFolderMember.shared_folder_id` ← `listSharedFolders`; `modifySharedLinkSettings.url` ← `listSharedLinks`).

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

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

The connector uses a single Dropbox OAuth2 connection — one credential, with no separate bot/user tokens. Capability is gated by the **OAuth scopes** granted when the connection is authorized (e.g. `files.content.write`, `sharing.read`); a call missing a scope fails with a `missing_scope` error naming the scope to reconnect with. Two resolvers, Zapier-first:

- **`zapier:<connection-id>`** _(recommended)_ — Zapier holds the refresh token and **rotates the short-lived (~4h) access token for you**, so this path doesn't expire mid-session. Find the ID with the Zapier SDK CLI: `npx zapier-sdk list-connections DropBoxCLIAPI` (run `login` first if unauthenticated; note the capital B; add `--json` for machine output).
- **`access-token:<ENV_VAR>`** _(fallback, direct mode)_ — a Dropbox access token read from the named environment variable. Mint one from a Dropbox app at <https://www.dropbox.com/developers/apps> (grant the scopes the tools you'll use need). **Heads-up: this connector sends the token as-is and does not refresh it** — a static Dropbox access token is short-lived and stops working after a few hours, so re-mint it or use the Zapier-managed path above, which handles rotation. See Dropbox's [OAuth Guide](https://developers.dropbox.com/oauth-guide) for token types and lifetimes.

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; see the reference you loaded above for how to inspect a script's exact schema in your shape).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, opt out of output validation (the exact syntax differs by shape — see the reference you loaded above). Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` (again, exact syntax per shape). The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` — or your shape's equivalent — to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

## References

Load the matching reference file before working in that area:

| Reference                                                                | Covers                                                                                                                                                                                                                                                                                                        | Load it when                                                                  |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`references/dropbox-api-gotchas.md`](references/dropbox-api-gotchas.md) | Stone `.tag` union shape, `error_summary` error model, read-vs-write not-found asymmetry, path rules (root is `""` not `"/"`), cursor pagination via sibling `/continue` endpoints, rate limits + namespace write-locking, upload-session flow, shared-link recovery, team-space targeting via `namespace_id` | Before making any direct Dropbox API calls or debugging unexpected API errors |
