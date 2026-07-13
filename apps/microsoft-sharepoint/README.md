# @zapier/microsoft-sharepoint-connector

_Independent, unofficial connector for Microsoft SharePoint. Not affiliated with, endorsed by, or sponsored by Microsoft SharePoint. "Microsoft SharePoint" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for **Microsoft SharePoint Online**, wrapping the [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-1.0) v1.0. Find sites and document libraries; browse, search, upload, download, move, copy, and share files and folders; manage SharePoint lists and their items; and author and publish site pages — 32 scripts in all. Read-only navigation scripts resolve the ids the write scripts need (a site is an opaque composite id from `findSites`/`getSite`; drives, items, lists, and pages likewise come from their `list*`/`find*` scripts). Auth is a single Microsoft OAuth 2.0 bearer token, either Zapier-managed or a direct token.

## When to use this

Reach for this connector when an agent needs to work with SharePoint Online content programmatically: find sites and files, upload or organize documents, share items with people or links, read and write list items, or author and publish site pages. It's the right pick whenever the task touches SharePoint document libraries, lists, or pages over the Microsoft Graph API.

## When NOT to use this

- **Personal OneDrive files, or Outlook mail/calendar** — those are separate Graph surfaces; use a OneDrive or the `microsoft-outlook` connector instead.
- **Change notifications / triggers** (new file, new list item) — this connector is request/response only; it doesn't subscribe to events.
- **Tenant administration** — content types, site columns, term-store metadata, site provisioning, and retention are out of scope.
- **Rich page authoring** — `createPage` writes a single text web part; images, embeds, multi-column layouts, and editing an existing page's body aren't supported.

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/microsoft-sharepoint-connector@latest run findSites '{ "search": "marketing" }' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/microsoft-sharepoint-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill microsoft-sharepoint
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment, and the connection id isn't itself a secret so you can pass it as-is), and `--connection env:<ENV_VAR>` reads a direct token from `$<ENV_VAR>` (the token stays in `env`, never on argv). The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. SharePoint's scopes are admin-consent-gated; see [`SKILL.md`](SKILL.md#auth) for the one-time admin consent and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "microsoft-sharepoint": {
      "command": "npx",
      "args": ["@zapier/microsoft-sharepoint-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

**Sites & drives**

| Script       | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| `findSites`  | Search sites by keyword (the site-discovery entry point).    |
| `getSite`    | Get a site by composite id, `root`, or `{hostname}:/{path}`. |
| `listDrives` | List a site's document libraries to resolve a `driveId`.     |

**Files & folders**

| Script            | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| `listFolderItems` | List the direct children of a folder or a drive root.         |
| `findFiles`       | Search files and folders by name/content within a drive.      |
| `getItem`         | Get a file or folder's metadata (with a download URL).        |
| `createFolder`    | Create a folder at the root or inside another folder.         |
| `uploadTextFile`  | Create a small text file from string content.                 |
| `uploadFile`      | Upload a binary file from a source URL (handles large files). |
| `replaceFile`     | Replace an existing file's contents from a source URL.        |
| `moveItem`        | Move / rename an item within the same document library.       |
| `copyItem`        | Copy a file/folder to another folder or drive (async).        |
| `getCopyStatus`   | Poll the status of an async copy started by `copyItem`.       |
| `deleteItem`      | Delete a file or folder (moves it to the recycle bin).        |
| `exportFile`      | Download a file converted to PDF / HTML / JPG / GLB.          |

**Sharing & permissions**

| Script                 | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `createSharingLink`    | Create a shareable link (view/edit/embed) to an item. |
| `inviteToItem`         | Grant named people read/write access to an item.      |
| `listItemPermissions`  | List the permissions on a file or folder.             |
| `removeItemPermission` | Revoke a permission from a file or folder.            |

**Lists & list items**

| Script           | Description                                              |
| ---------------- | -------------------------------------------------------- |
| `listLists`      | List a site's lists (also serves single-list lookup).    |
| `createList`     | Create a new list in a site.                             |
| `listColumns`    | List a list's column definitions (internal field names). |
| `findListItems`  | List or filter items in a list, with column values.      |
| `getListItem`    | Get a single list item with its column values.           |
| `createListItem` | Create a new item in a list.                             |
| `updateListItem` | Update column values on an existing list item.           |
| `deleteListItem` | Delete a list item (hard delete, not the recycle bin).   |

**Pages**

| Script        | Description                                             |
| ------------- | ------------------------------------------------------- |
| `listPages`   | List a site's pages to resolve a `pageId`.              |
| `getPage`     | Get a single site page by id.                           |
| `createPage`  | Create a draft site page, optionally with text content. |
| `publishPage` | Publish a draft site page.                              |
| `deletePage`  | Delete a site page (moves it to the recycle bin).       |

Run `npx @zapier/microsoft-sharepoint-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

```ts
import { findFiles } from "@zapier/microsoft-sharepoint-connector";

const { data } = await findFiles(
  { siteId: "contoso.sharepoint.com,2c71…,2d22…", search: "Q3 report" },
  { connection: "env:<ENV_VAR>" },
);
// data → { items: [ { id, name, webUrl, ... } ], next_cursor?: string }
```

## Links

- [Microsoft Graph SharePoint API docs](https://learn.microsoft.com/en-us/graph/api/resources/sharepoint?view=graph-rest-1.0)
- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/microsoft-sharepoint)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Microsoft SharePoint's API, services, data, schemas, documentation, or other materials, which remain the property of Microsoft SharePoint. Your use of Microsoft SharePoint's API is governed by your own agreement with Microsoft SharePoint.

**Trademarks and affiliation.** Microsoft SharePoint and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Microsoft SharePoint.

**Your responsibility.** This connector calls Microsoft SharePoint's API using credentials you supply. You are responsible for holding a valid Microsoft SharePoint account, for complying with Microsoft SharePoint's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Microsoft SharePoint product. Zapier is not responsible for changes Microsoft SharePoint makes to its API or for any consequence of your use of Microsoft SharePoint's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
