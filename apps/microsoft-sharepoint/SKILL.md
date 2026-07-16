---
name: microsoft-sharepoint
description: Agent-callable Microsoft SharePoint tools — find sites and document libraries, browse, search, upload, move and share files, manage lists and list items, and author site pages. Use when the user mentions SharePoint or wants to work with SharePoint sites, files, folders, lists, or pages, even if they don't name SharePoint explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
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

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill microsoft-sharepoint` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                          | Load                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__microsoft-sharepoint__<tool>`), or you can register a local server yourself (or guide the user to)     | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                                    | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                           | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Microsoft Graph API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

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

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

No connection yet? Pick one — and follow the reference's own flow to obtain it; never just ask the user for a connection id or token as if they already have one memorized:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; see the reference you loaded above for how to inspect a script's exact schema in your shape).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, opt out of output validation (the exact syntax differs by shape — see the reference you loaded above). Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` (again, exact syntax per shape). The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` — or your shape's equivalent — to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

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
