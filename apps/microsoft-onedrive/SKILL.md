---
name: microsoft-onedrive
description: Agent-callable Microsoft OneDrive tools — browse, search, upload, download and convert, move, copy, and share files and folders. Use when the user mentions OneDrive or wants to work with their OneDrive files, folders, or sharing links, even if they don't name OneDrive explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/microsoft-onedrive/SKILL.md
  title: Microsoft OneDrive
  api-docs: https://learn.microsoft.com/en-us/graph/api/resources/onedrive
  zapier-app-key: MicrosoftOneDriveCLIAPI
---

# Microsoft OneDrive

<!-- BEGIN:skill-intro -->

Agent-callable tools for Microsoft OneDrive, over the [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/api/resources/onedrive) v1.0 (`https://graph.microsoft.com/v1.0/me/drive/...`): browse and search files and folders; upload, download and convert, move, copy, and delete them; and create and manage sharing links and per-person permissions. 20 scripts across drives, files & folders, and sharing & permissions. Every file tool defaults to the caller's own OneDrive and takes an optional `driveId` to target another drive; read tools resolve the ids the write tools need (`itemId`, `driveId`, `permissionId`, and the copy `monitorUrl`). Shared content is reached with `findItemsByKql` (search) or `getItemByShareUrl` (resolve a pasted link).

<!-- legal:disclaimer -->

_Independent, unofficial connector for Microsoft OneDrive. Not affiliated with, endorsed by, or sponsored by Microsoft OneDrive. "Microsoft OneDrive" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:skill-intro -->

## When to use this

<!-- BEGIN:skill-use-cases -->

- An agent needs to **find or read** OneDrive content — check a drive's storage quota, list a folder's contents, search a drive, resolve a shared link, or read a file's metadata (with a short-lived download URL).
- An agent needs to **work with files** — create folders, upload text or binary files, replace a file's contents, move / rename, copy (async), export to PDF / HTML / JPG, or delete.
- An agent needs to **share and manage access** — create sharing links, invite named people, and list or revoke permissions.
- An agent needs to **reach shared content** — search across items shared with the caller via KQL, or turn a pasted OneDrive/SharePoint sharing URL into an actionable item.

<!-- END:skill-use-cases -->

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill microsoft-onedrive` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                             | Load                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__microsoft-onedrive__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                                       | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                              | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Microsoft OneDrive API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

<!-- BEGIN:skill-connections-note -->

All scripts use the single connection `microsoft-onedrive`, except `getCopyStatus`, which needs no connection (it polls a pre-authenticated monitor URL). Every file/folder tool takes an optional `driveId` — omit it for the caller's own OneDrive, or pass one from `listDrives` (or a shared item's `remoteItem.parentReference.driveId`) to target another drive.
<!-- END:skill-connections-note -->

<!-- BEGIN:skill-scripts-table -->

| Script                                                               | Script name            | Connections          | Description                                                      |
| -------------------------------------------------------------------- | ---------------------- | -------------------- | ---------------------------------------------------------------- |
| [`scripts/getDrive.ts`](scripts/getDrive.ts)                         | `getDrive`             | `microsoft-onedrive` | Get a drive's metadata and storage quota (own drive by default). |
| [`scripts/listDrives.ts`](scripts/listDrives.ts)                     | `listDrives`           | `microsoft-onedrive` | List the drives available to the user, to resolve a `driveId`.   |
| [`scripts/listFolderItems.ts`](scripts/listFolderItems.ts)           | `listFolderItems`      | `microsoft-onedrive` | List the direct children of a folder or the drive root.          |
| [`scripts/findFiles.ts`](scripts/findFiles.ts)                       | `findFiles`            | `microsoft-onedrive` | Search files and folders by name/content within one drive.       |
| [`scripts/findItemsByKql.ts`](scripts/findItemsByKql.ts)             | `findItemsByKql`       | `microsoft-onedrive` | Search own + shared items via Microsoft Search (keyword/KQL).    |
| [`scripts/getItemByShareUrl.ts`](scripts/getItemByShareUrl.ts)       | `getItemByShareUrl`    | `microsoft-onedrive` | Resolve a sharing URL (or share id) to a file or folder.         |
| [`scripts/getItem.ts`](scripts/getItem.ts)                           | `getItem`              | `microsoft-onedrive` | Get a file or folder's metadata (with a download URL) by id.     |
| [`scripts/createFolder.ts`](scripts/createFolder.ts)                 | `createFolder`         | `microsoft-onedrive` | Create a folder at the root or inside another folder.            |
| [`scripts/uploadTextFile.ts`](scripts/uploadTextFile.ts)             | `uploadTextFile`       | `microsoft-onedrive` | Create a small text file from string content.                    |
| [`scripts/uploadFile.ts`](scripts/uploadFile.ts)                     | `uploadFile`           | `microsoft-onedrive` | Upload a binary file from a source URL (handles large files).    |
| [`scripts/replaceFile.ts`](scripts/replaceFile.ts)                   | `replaceFile`          | `microsoft-onedrive` | Replace an existing file's contents from a source URL.           |
| [`scripts/moveItem.ts`](scripts/moveItem.ts)                         | `moveItem`             | `microsoft-onedrive` | Move / rename an item within the same drive.                     |
| [`scripts/copyItem.ts`](scripts/copyItem.ts)                         | `copyItem`             | `microsoft-onedrive` | Copy a file/folder to another folder or drive (async).           |
| [`scripts/getCopyStatus.ts`](scripts/getCopyStatus.ts)               | `getCopyStatus`        | _(none)_             | Poll the status of an async copy started by `copyItem`.          |
| [`scripts/deleteItem.ts`](scripts/deleteItem.ts)                     | `deleteItem`           | `microsoft-onedrive` | Delete a file or folder (moves it to the recycle bin).           |
| [`scripts/exportFile.ts`](scripts/exportFile.ts)                     | `exportFile`           | `microsoft-onedrive` | Download a file converted to PDF / HTML / JPG.                   |
| [`scripts/createSharingLink.ts`](scripts/createSharingLink.ts)       | `createSharingLink`    | `microsoft-onedrive` | Create a shareable link (view/edit/embed) to an item.            |
| [`scripts/inviteToItem.ts`](scripts/inviteToItem.ts)                 | `inviteToItem`         | `microsoft-onedrive` | Grant named people read/write access to an item.                 |
| [`scripts/listItemPermissions.ts`](scripts/listItemPermissions.ts)   | `listItemPermissions`  | `microsoft-onedrive` | List the permissions on a file or folder.                        |
| [`scripts/removeItemPermission.ts`](scripts/removeItemPermission.ts) | `removeItemPermission` | `microsoft-onedrive` | Revoke a permission from a file or folder.                       |

<!-- END:skill-scripts-table -->

<!-- BEGIN:disambiguation-and-refusals? -->

## Disambiguation & refusals

**Disambiguation before a write.** Before writing to a file or folder you looked up by name — from `findFiles`, `findItemsByKql`, or `listFolderItems` — count the **exact case-insensitive name matches**:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (`parentReference.path`, `webUrl`, `lastModifiedDateTime`, or `id`) and ask which one the user means. Don't pick arbitrarily, and don't write to all of them. File names collide constantly across folders (e.g. two `report.docx`).

**Unsupported operations — say so and stop; don't fake it with another tool.** This catalog deliberately does **not**:

- **Trigger on new or changed files** (new-file / new-or-updated-file polling). Triggers aren't exposed. Don't simulate one by repeatedly listing or searching and reporting a "trigger."
- **Move a file across drives (no native cross-drive move).** `moveItem` is same-drive only. Relocating across drives means `copyItem` → (`getCopyStatus`) → `deleteItem`, which is **lossy**: the copy gets a new id and URL, and its sharing links and permissions don't carry over. You may perform this when asked to move a file to another drive, but **never present it as a plain "move"**: warn the user it's a copy-then-delete, confirm the copy succeeded via `getCopyStatus` before deleting the original, and report the new location. Never silently copy-delete and report a completed move.
- **Enumerate everything shared with the user.** This catalog doesn't expose a "list shared with me" tool. Reach shared content via `findItemsByKql` (search) or `getItemByShareUrl` (resolve a pasted link).
- **Restore from the recycle bin, read/write Excel workbook ranges, sync a change feed (delta), or manage file versions/thumbnails.** These aren't exposed. `deleteItem` is recoverable only by a user in the OneDrive UI, not via a follow-up call here.

If asked for any of these, tell the user it's unsupported and stop — don't reach for an unrelated tool to approximate it.
<!-- END:disambiguation-and-refusals -->

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

<!-- BEGIN:skill-auth-notes? operational behavior that differs by WHICH resolver is used — a safety gate only one path enforces, scopes/permissions that differ between resolvers, a billing/plan difference tied to the auth path, or a feature only available (or unavailable) on one resolver. Not for describing how to obtain or pass a credential — that's references/use-without-zapier.md's job. Leave this region empty (unfilled) if every resolver behaves identically. -->
<!-- END:skill-auth-notes -->

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

<!-- BEGIN:skill-references-table -->

## References

Load the matching reference file before working in that area:

| Reference                                                                         | Covers                                                                                                                                                                                                                                                                                                                                               | Load it when                                                                                                                                                                |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [microsoft-onedrive-api-gotchas.md](references/microsoft-onedrive-api-gotchas.md) | Graph OAuth scopes, the error envelope (403/404/409/429), cursor pagination, `/me/drive` vs `/drives/{driveId}` addressing, short-lived pre-authenticated download URLs, resumable uploads, async copy, export/convert, per-drive vs KQL search, sharing links/invites/permissions, and shared-content addressing (`remoteItem`, `/shares/{token}`). | A call errors unexpectedly (403/404/429, name conflict), you're resolving a drive or item id, uploading or exporting a file, or working with shared content or permissions. |

<!-- END:skill-references-table -->
