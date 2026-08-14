# @zapier/microsoft-onedrive-connector

<!-- BEGIN:readme-intro -->

Agent-callable tools for **Microsoft OneDrive**, wrapping the [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/api/resources/onedrive) v1.0. Browse and search files and folders; upload, download and convert, move, copy, and delete them; and create and manage sharing links and per-person permissions — 20 scripts in all. Every file tool defaults to the caller's own OneDrive and takes an optional `driveId` to target another drive; read-only scripts resolve the ids the write scripts need (item ids from `listFolderItems`/`findFiles`/`getItem`, drive ids from `listDrives`, permission ids from `listItemPermissions`). Auth is a single Microsoft OAuth 2.0 bearer token, either Zapier-managed or a direct token.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Microsoft OneDrive. Not affiliated with, endorsed by, or sponsored by Microsoft OneDrive. "Microsoft OneDrive" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:readme-intro -->

## When to use this

<!-- BEGIN:readme-when-to-use -->

Reach for this connector when an agent needs to work with a user's OneDrive files programmatically: browse or search a drive, upload or organize documents, convert a file to PDF/HTML/JPG, share items with people or links, or manage permissions. It's the right pick whenever the task touches a user's OneDrive files and folders over the Microsoft Graph API.
<!-- END:readme-when-to-use -->

## When NOT to use this

<!-- BEGIN:readme-when-not-to-use -->

- **SharePoint sites, document libraries, lists, or pages** — those are a separate Graph surface; use the `microsoft-sharepoint` connector. (This connector can still address a shared SharePoint file by its drive + item id.)
- **Outlook mail or calendar** — use the `microsoft-outlook` connector.
- **Change notifications / triggers** (new file, new-or-updated file) — this connector is request/response only; it doesn't subscribe to events.
- **Excel workbook ranges, delta sync, file versions, thumbnails, or recycle-bin restore** — these Graph surfaces are out of scope.

<!-- END:readme-when-not-to-use -->

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/microsoft-onedrive-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/microsoft-onedrive-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill microsoft-onedrive
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "microsoft-onedrive": {
      "command": "npx",
      "args": ["@zapier/microsoft-onedrive-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

### Cloning the source

You don't need to clone anything to use this connector — the options above already cover that. Want the actual repo source instead, to read the script code, browse `references/`, run this connector's tests, or hack on it? Clone with a path filter so you only fetch this one connector, not the whole catalog:

```bash
git clone --filter=blob:none --sparse https://github.com/zapier/connectors.git
cd connectors && git sparse-checkout set apps/microsoft-onedrive
cd apps/microsoft-onedrive && npm install
```

See the [main README](https://github.com/zapier/connectors#cloning-the-source) to clone several connectors at once.

## Scripts

<!-- BEGIN:readme-scripts-table -->

| Script              | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `getDrive`          | Get a drive's metadata and storage quota (own drive by default). |
| `listDrives`        | List the drives available to the user, to resolve a `driveId`.   |
| `listFolderItems`   | List the direct children of a folder or the drive root.          |
| `findFiles`         | Search files and folders by name/content within one drive.       |
| `findItemsByKql`    | Search own + shared items via Microsoft Search (keyword/KQL).    |
| `getItemByShareUrl` | Resolve a sharing URL (or share id) to a file or folder.         |
| `getItem`           | Get a file or folder's metadata (with a download URL) by id.     |

**Files & folders**

| Script           | Description                                                   |
| ---------------- | ------------------------------------------------------------- |
| `createFolder`   | Create a folder at the root or inside another folder.         |
| `uploadTextFile` | Create a small text file from string content.                 |
| `uploadFile`     | Upload a binary file from a source URL (handles large files). |
| `replaceFile`    | Replace an existing file's contents from a source URL.        |
| `moveItem`       | Move / rename an item within the same drive.                  |
| `copyItem`       | Copy a file/folder to another folder or drive (async).        |
| `getCopyStatus`  | Poll the status of an async copy started by `copyItem`.       |
| `deleteItem`     | Delete a file or folder (moves it to the recycle bin).        |
| `exportFile`     | Download a file converted to PDF / HTML / JPG.                |

**Sharing & permissions**

| Script                 | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `createSharingLink`    | Create a shareable link (view/edit/embed) to an item. |
| `inviteToItem`         | Grant named people read/write access to an item.      |
| `listItemPermissions`  | List the permissions on a file or folder.             |
| `removeItemPermission` | Revoke a permission from a file or folder.            |

<!-- END:readme-scripts-table -->

Run `npx @zapier/microsoft-onedrive-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

<!-- BEGIN:readme-usage-example -->

```ts
import { findFiles } from "@zapier/microsoft-onedrive-connector";

const { data } = await findFiles(
  { search: "Q3 report" },
  { connection: "env:MICROSOFT_ONEDRIVE_ACCESS_TOKEN" },
);
// data → { items: [ { id, name, webUrl, ... } ], next_cursor?: string }
```

<!-- END:readme-usage-example -->

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/microsoft-onedrive)

<!-- BEGIN:readme-links-extra -->

- [Microsoft Graph OneDrive API docs](https://learn.microsoft.com/en-us/graph/api/resources/onedrive)

<!-- END:readme-links-extra -->

<!-- BEGIN:readme-footer? -->
<!-- legal:footer -->

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Microsoft OneDrive's API, services, data, schemas, documentation, or other materials, which remain the property of Microsoft OneDrive. Your use of Microsoft OneDrive's API is governed by your own agreement with Microsoft OneDrive.

**Trademarks and affiliation.** Microsoft OneDrive and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Microsoft OneDrive.

**Your responsibility.** This connector calls Microsoft OneDrive's API using credentials you supply. You are responsible for holding a valid Microsoft OneDrive account, for complying with Microsoft OneDrive's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Microsoft OneDrive product. Zapier is not responsible for changes Microsoft OneDrive makes to its API or for any consequence of your use of Microsoft OneDrive's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
<!-- /legal:footer -->
<!-- END:readme-footer -->
