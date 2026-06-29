---
name: dropbox
description: Agent-callable Dropbox tools — upload, organize, find, and share files and folders. Use when the user wants to manage Dropbox content (save, move, search, share, list, or read files), including requests that don't name Dropbox explicitly, e.g. "save this report to my cloud storage" or "share that folder with Sam".
license: Elastic-2.0
compatibility: Requires Node.js 22.18+; run `npm install` in this directory first.
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

**If this connector is already exposed to you as callable tools** (e.g. `mcp__dropbox__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill dropbox` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

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

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

The connector uses a single Dropbox OAuth2 connection — one credential, with no separate bot/user tokens. Capability is gated by the **OAuth scopes** granted when the connection is authorized (e.g. `files.content.write`, `sharing.read`); a call missing a scope fails with a `missing_scope` error naming the scope to reconnect with. Two resolvers, Zapier-first:

- **`zapier:<connection-id>`** _(recommended)_ — route through a Zapier-managed Dropbox connection; Zapier holds the refresh token and **rotates the short-lived (~4h) access token for you**, so this path doesn't expire mid-session. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>; ~1 minute). The user authorizes Dropbox once via Zapier's OAuth flow at <https://zapier.com/app/connections>. Find the ID with the Zapier SDK CLI: `npx @zapier/zapier-sdk-cli list-connections DropBoxCLIAPI` (run `login` first if unauthenticated; use `DropBoxCLIAPI` exactly, note the capital B; add `--json` for machine output).
- **`access-token:<ENV_VAR>`** _(fallback, direct mode)_ — read a Dropbox access token from the named environment variable (e.g. `access-token:DROPBOX_ACCESS_TOKEN`, with the token exported in `DROPBOX_ACCESS_TOKEN`; the token stays in `env`, never on argv), sent as `Authorization: Bearer <token>`. Mint one from a Dropbox app at <https://www.dropbox.com/developers/apps> (grant the scopes the tools you'll use need). **Heads-up: this connector sends the token as-is and does not refresh it** — a static Dropbox access token is short-lived and stops working after a few hours, so re-mint it or use the Zapier-managed path above, which handles rotation. See Dropbox's [OAuth Guide](https://developers.dropbox.com/oauth-guide) for token types and lifetimes.

If no connection is passed the script fails with an actionable error telling you to `Pass --connection [<resolver>:]<value>` and lists the resolvers in match order.

## Running scripts

After `npm install`, run a script by name with `node cli.js run <script>`, or execute its file directly — both take the same arguments and both accept `--help`. Always run a script's `--help` first to learn its exact input schema and connections, then invoke it:

```bash
node cli.js run <script> '<input-json>' --connection [<resolver>:]<value>
./scripts/<script>.ts '<input-json>' --connection [<resolver>:]<value>
```

When a harness can't execute scripts directly, fall back to MCP — `node cli.js mcp` serves every script as a tool over stdio. Register it as a local MCP server in your client: the stanza is harness-specific (an `mcpServers` entry in Claude Desktop, Cursor, Claude Code, …) with `command: "node"`, `args: ["cli.js", "mcp"]`, run from this directory. Run `node cli.js mcp --help` for auth options. Add the stanza yourself if you can edit the client's MCP config; otherwise guide the user. If a local server isn't possible, guide the user to use Zapier's remote MCP servers at <https://mcp.zapier.com> instead.

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; run the script's `--help` to see that exact schema).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, append `--skipOutputDataValidation` to the script invocation. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, append `--filterOutputData '<jq>'` — a jq expression that post-processes `data`. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

## API quirks worth knowing

See [`references/dropbox-api-gotchas.md`](references/dropbox-api-gotchas.md) for the durable per-app knowledge — the Stone `.tag` union shape, the `error_summary` error model and read-vs-write not-found asymmetry, path rules (root is `""`, not `"/"`), cursor pagination via sibling `/continue` endpoints, rate limits + namespace write-locking, the upload-session flow, shared-link recovery, and team-space targeting via `namespace_id`.
