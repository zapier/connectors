---
name: microsoft-sharepoint
description: Agent-callable Microsoft SharePoint tools — find sites and document libraries, browse, search, upload, move and share files, manage lists and list items, and author site pages. Use when the user mentions SharePoint or wants to work with SharePoint sites, files, folders, lists, or pages, even if they don't name SharePoint explicitly.
license: Elastic-2.0
compatibility: Run `npm install` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/microsoft-sharepoint/SKILL.md
  title: Microsoft SharePoint
  api-docs: https://learn.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-1.0
  zapier-app-key: MicrosoftSharePointCLIAPI
---

# Microsoft SharePoint

_Independent, unofficial connector for Microsoft SharePoint. Not affiliated with, endorsed by, or sponsored by Microsoft SharePoint. "Microsoft SharePoint" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for Microsoft SharePoint Online, over the [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-1.0) v1.0 (`https://graph.microsoft.com/v1.0/sites/...`): find sites and document libraries; browse, search, upload, download, move, copy, and share files and folders; manage SharePoint lists and list items; and author and publish site pages. 32 scripts across sites, drives, files & folders, sharing & permissions, lists, list items, and pages. Read-only navigation tools resolve the ids (`siteId`, `driveId`, `listId`, `pageId`, column internal names) that the write tools require — a site is addressed by an opaque composite id you get from `findSites`/`getSite`, never constructed by hand.

## When to use this

- An agent needs to **find or read** SharePoint content — search sites, list a site's document libraries, browse or search files and folders, or read a file's / list-item's / page's details.
- An agent needs to **work with files** — create folders, upload text or binary files, move / copy / rename, export to PDF or HTML, or share (links and per-person grants) and manage permissions.
- An agent needs to **work with lists** — list a site's lists, discover a list's columns, create lists, and create / read / update / delete list items.
- An agent needs to **author pages** — create a draft site page (optionally with text body content) and publish it.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__microsoft-sharepoint__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill microsoft-sharepoint` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`. On older Node, run `node cli.js --help` anyway: it detects your runtime and prints how to run without upgrading (the prebuilt npm package, or another runtime) — don't skip the connector just because Node is old.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

All scripts use the single connection `microsoft-sharepoint`, except `getCopyStatus`, which needs no connection (it polls a pre-authenticated monitor URL).

| Script                                                               | Script name            | Connections            | Description                                                      |
| -------------------------------------------------------------------- | ---------------------- | ---------------------- | ---------------------------------------------------------------- |
| [`scripts/findSites.ts`](scripts/findSites.ts)                       | `findSites`            | `microsoft-sharepoint` | Search sites by keyword; the primary site-discovery entry point. |
| [`scripts/getSite.ts`](scripts/getSite.ts)                           | `getSite`              | `microsoft-sharepoint` | Get a site by composite id, `root`, or `{hostname}:/{path}`.     |
| [`scripts/listDrives.ts`](scripts/listDrives.ts)                     | `listDrives`           | `microsoft-sharepoint` | List a site's document libraries to resolve a `driveId`.         |
| [`scripts/listFolderItems.ts`](scripts/listFolderItems.ts)           | `listFolderItems`      | `microsoft-sharepoint` | List the direct children of a folder or a drive root.            |
| [`scripts/findFiles.ts`](scripts/findFiles.ts)                       | `findFiles`            | `microsoft-sharepoint` | Search files and folders by name/content within a drive.         |
| [`scripts/getItem.ts`](scripts/getItem.ts)                           | `getItem`              | `microsoft-sharepoint` | Get a file or folder's metadata (with a download URL) by id.     |
| [`scripts/createFolder.ts`](scripts/createFolder.ts)                 | `createFolder`         | `microsoft-sharepoint` | Create a folder at the root or inside another folder.            |
| [`scripts/uploadTextFile.ts`](scripts/uploadTextFile.ts)             | `uploadTextFile`       | `microsoft-sharepoint` | Create a small text file from string content.                    |
| [`scripts/uploadFile.ts`](scripts/uploadFile.ts)                     | `uploadFile`           | `microsoft-sharepoint` | Upload a binary file from a source URL (handles large files).    |
| [`scripts/replaceFile.ts`](scripts/replaceFile.ts)                   | `replaceFile`          | `microsoft-sharepoint` | Replace an existing file's contents from a source URL.           |
| [`scripts/moveItem.ts`](scripts/moveItem.ts)                         | `moveItem`             | `microsoft-sharepoint` | Move / rename an item within the same document library.          |
| [`scripts/copyItem.ts`](scripts/copyItem.ts)                         | `copyItem`             | `microsoft-sharepoint` | Copy a file/folder to another folder or drive (async).           |
| [`scripts/getCopyStatus.ts`](scripts/getCopyStatus.ts)               | `getCopyStatus`        | _(none)_               | Poll the status of an async copy started by `copyItem`.          |
| [`scripts/deleteItem.ts`](scripts/deleteItem.ts)                     | `deleteItem`           | `microsoft-sharepoint` | Delete a file or folder (moves it to the recycle bin).           |
| [`scripts/exportFile.ts`](scripts/exportFile.ts)                     | `exportFile`           | `microsoft-sharepoint` | Download a file converted to PDF / HTML / JPG / GLB.             |
| [`scripts/createSharingLink.ts`](scripts/createSharingLink.ts)       | `createSharingLink`    | `microsoft-sharepoint` | Create a shareable link (view/edit/embed) to an item.            |
| [`scripts/inviteToItem.ts`](scripts/inviteToItem.ts)                 | `inviteToItem`         | `microsoft-sharepoint` | Grant named people read/write access to an item.                 |
| [`scripts/listItemPermissions.ts`](scripts/listItemPermissions.ts)   | `listItemPermissions`  | `microsoft-sharepoint` | List the permissions on a file or folder.                        |
| [`scripts/removeItemPermission.ts`](scripts/removeItemPermission.ts) | `removeItemPermission` | `microsoft-sharepoint` | Revoke a permission from a file or folder.                       |
| [`scripts/listLists.ts`](scripts/listLists.ts)                       | `listLists`            | `microsoft-sharepoint` | List a site's lists (also serves single-list lookup).            |
| [`scripts/createList.ts`](scripts/createList.ts)                     | `createList`           | `microsoft-sharepoint` | Create a new list in a site.                                     |
| [`scripts/listColumns.ts`](scripts/listColumns.ts)                   | `listColumns`          | `microsoft-sharepoint` | List a list's column definitions (internal field names).         |
| [`scripts/findListItems.ts`](scripts/findListItems.ts)               | `findListItems`        | `microsoft-sharepoint` | List or filter items in a list, with column values.              |
| [`scripts/getListItem.ts`](scripts/getListItem.ts)                   | `getListItem`          | `microsoft-sharepoint` | Get a single list item with its column values.                   |
| [`scripts/createListItem.ts`](scripts/createListItem.ts)             | `createListItem`       | `microsoft-sharepoint` | Create a new item in a list.                                     |
| [`scripts/updateListItem.ts`](scripts/updateListItem.ts)             | `updateListItem`       | `microsoft-sharepoint` | Update column values on an existing list item.                   |
| [`scripts/deleteListItem.ts`](scripts/deleteListItem.ts)             | `deleteListItem`       | `microsoft-sharepoint` | Delete a list item (hard delete, not the recycle bin).           |
| [`scripts/listPages.ts`](scripts/listPages.ts)                       | `listPages`            | `microsoft-sharepoint` | List a site's pages to resolve a `pageId`.                       |
| [`scripts/getPage.ts`](scripts/getPage.ts)                           | `getPage`              | `microsoft-sharepoint` | Get a single site page by id.                                    |
| [`scripts/createPage.ts`](scripts/createPage.ts)                     | `createPage`           | `microsoft-sharepoint` | Create a draft site page, optionally with text content.          |
| [`scripts/publishPage.ts`](scripts/publishPage.ts)                   | `publishPage`          | `microsoft-sharepoint` | Publish a draft site page.                                       |
| [`scripts/deletePage.ts`](scripts/deletePage.ts)                     | `deletePage`           | `microsoft-sharepoint` | Delete a site page (moves it to the recycle bin).                |

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

The connector uses a single Microsoft **OAuth 2.0 bearer token** (Microsoft identity platform / Entra) for every tool, resolved into the one `microsoft-sharepoint` connection. Two resolvers:

- **`zapier:<connection-id>`** — Zapier-managed auth (recommended). Route through a Zapier Microsoft SharePoint connection; the Zapier auth, token-refresh, and governance layer injects and renews the token for you. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>). Find the connection id with the Zapier SDK CLI: `npx @zapier/zapier-sdk-cli list-connections MicrosoftSharePointCLIAPI` (run `login` first if unauthenticated; add `--json` for machine output). Conventionally stored in `MICROSOFT_SHAREPOINT_ZAPIER_CONNECTION_ID`.
- **`env:<ENV_VAR>`** — direct mode. Read a Microsoft Graph access token from the named environment variable (conventionally `env:MICROSOFT_SHAREPOINT_ACCESS_TOKEN`, with the token exported in `MICROSOFT_SHAREPOINT_ACCESS_TOKEN`). The token is sent as `Authorization: Bearer <token>`; there is no refresh in this mode, so supply a currently-valid token.

**Admin consent is inherent to SharePoint.** Site content is an organizational resource: the site-content scopes this connector needs (`Sites.Read.All`, `Sites.ReadWrite.All`, `Sites.Manage.All`, `Files.ReadWrite.All`) are all **admin-consent-gated**. `offline_access` and `User.Read` are user-consentable and ride along as the baseline, but there is no lower-privilege subset that reaches site content. In a typical Microsoft 365 tenant a **tenant administrator must consent once**; after that, ordinary users can connect without further prompts. A non-admin connecting in a consent-restricted tenant will see sign-in fail with an "approval required" message until an admin grants consent. At API-call time, a token missing a granted scope returns `403` — surfaced by these tools as a clear "an administrator must consent to the required SharePoint permissions" message.

If no connection is passed, a script that needs one fails with an actionable error telling you to `Pass --connection [<resolver>:]<value>` and lists the resolvers in match order.

## Running scripts

After `npm install`, run a script by name with `node cli.js run <script>`, or execute its file directly — both take the same arguments and both accept `--help`. Always run a script's `--help` first to learn its exact input schema and connections, then invoke it:

```bash
# default — via the entry point; self-checks readiness and prints friendly diagnostics
node cli.js run <script> '<input-json>' --connection [<resolver>:]<value>
# shorthand — runs the script file directly (same args, same Node 22.18+ need, no readiness check)
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

## Disambiguation & refusals

**Disambiguation before a write.** Before writing to something you looked up by name — a site from `findSites`, a list from `listLists`, or a list item from `findListItems` — count the **exact case-insensitive name matches**:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (`webUrl`, `id`, or `lastModifiedDateTime`) and ask which one the user means. Don't pick arbitrarily, and don't write to all of them. Site names in particular collide across departments (e.g. two "Marketing" sites).

**Unsupported operations — say so and stop; don't fake it with another tool.** This catalog deliberately does **not**:

- **Move a file across libraries or sites (no native move).** `moveItem` is same-library only. The only way to relocate across libraries/sites is `copyItem` → (`getCopyStatus`) → `deleteItem`, which is **lossy**: the copy gets a new id and URL, its sharing links and permissions don't carry over, and a half-failed copy can lose the file. You may perform this relocation when asked to move a file elsewhere, but **never present it as a plain "move"**: warn the user first that it's a copy-then-delete, tell them the file's URL/id changes and sharing links & permissions won't carry over, confirm the copy succeeded via `getCopyStatus` before deleting the original, and report the new location. Never silently copy-delete and report a completed move.
- **Edit an existing page's body, or add non-text web parts** (images, embeds, quick-links, multi-column layouts). `createPage` authors a single text web part on a **new** page; editing an existing page's content and rich web parts are out of scope. **Do not delete the page and recreate it to simulate an edit** — that changes the page's id/URL and loses its version history, comments, and permissions. Tell the user in-place body editing isn't supported and stop.
- **Enumerate every site in the tenant.** There is no "list all sites" — a delegated token can't. Use `findSites` (keyword) or `getSite` with a known path.
- **Manage content types, site columns, term-store metadata, or triggers** (new-file / new-item notifications). These aren't exposed.
- **Write person/group or multi-value lookup columns** on list items. Those column types are read-only here.

If asked for any of these, tell the user it's unsupported and stop — don't reach for an unrelated tool to approximate it.

## References

Load the matching reference file before working in that area:

| Reference                                                                             | Covers                                                                                                                                                                                                                                                                                                                                   | Load it when                                                                                                                                                           |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [microsoft-sharepoint-api-gotchas.md](references/microsoft-sharepoint-api-gotchas.md) | Graph permission scopes, error envelope (403/404/429), pagination, site/drive addressing, short-lived download URLs, async copy, resumable uploads, same-drive move, delete semantics, sharing links/invites/permissions, list-item column values (LookupId, 12-lookup limit, multi-value), and site-page draft/publish/type-cast rules. | A call errors unexpectedly (403/404/429, name conflict), you're resolving a site or drive id, working with list-item column values, or creating/publishing site pages. |
