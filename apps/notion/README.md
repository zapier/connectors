# @zapier/notion-connector

_Independent, unofficial connector for Notion. Not affiliated with, endorsed by, or sponsored by Notion. "Notion" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable Notion tools wrapping the [Notion API](https://developers.notion.com/reference/intro) (`https://api.notion.com/v1/`, API version `2025-09-03`): search pages and data sources, read and create pages, query data-source rows, append and edit block content, manage database / data-source schemas, read and post comments. 24 tools across search, read, write, schema, comments, and cross-workspace copy. This version uses Notion's **data sources** model — a database is a container holding one or more data sources, and a data source carries the schema + the rows. Auth is a single Notion bearer token, resolved either from an environment variable (direct mode) or through a Zapier-managed connection (`copyPage` is the exception — it uses two connections to copy across workspaces).

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## Install

```bash
# Run a tool with zero install — npx fetches the package on first use
NOTION_TOKEN=secret_xxx npx @zapier/notion-connector run search '{"query":"Q4"}' --connection env:NOTION_TOKEN

# Install as a dependency to import the tools in your own code
npm install @zapier/notion-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill notion
```

Credentials are environment-variable only (never passed on argv). Pass auth as one connection string with `--connection [<resolver>:]<value>`: `env:NOTION_TOKEN` reads a Notion token (internal-integration secret or public-integration OAuth token) from the environment, or `zapier:<connection-id>` routes through Zapier-managed auth (no third-party secret enters the agent's environment); see [`SKILL.md`](SKILL.md#auth) for the capabilities gating, the per-resource sharing requirement, and how to find a connection ID.

Requires Node.js 22.18+ on `PATH`.

## Tools

One file per tool in [`scripts/`](scripts/); each tool's `inputSchema` / `outputSchema` (Zod) is the source of truth for its contract. All tools use the single `notion` connection, except `copyPage`, which uses two (`source` + `target`) to copy a page across workspaces.

| Tool                  | Description                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `search`              | Search pages and data sources by title (the id-resolution entry point).                            |
| `getPage`             | Retrieve a page's metadata + property values by id.                                                |
| `getDatabase`         | Retrieve a database container and its list of data sources.                                        |
| `getDataSource`       | Retrieve a data source's property schema (names, types, options).                                  |
| `queryDataSource`     | Query the rows (pages) of a data source with filter / sorts.                                       |
| `getBlockChildren`    | List the child blocks (body content) of a page or block.                                           |
| `getBlock`            | Retrieve a single block by id.                                                                     |
| `getPageAsMarkdown`   | Retrieve a page's body content as Markdown.                                                        |
| `getPageProperty`     | Retrieve a single (paginated) page property value.                                                 |
| `listComments`        | List unresolved comments on a page or block.                                                       |
| `listUsers`           | List workspace users (members + bots).                                                             |
| `getUser`             | Retrieve a single user by id.                                                                      |
| `getBotUser`          | Retrieve the bot user for the current token (integration identity).                                |
| `createPage`          | Create a page: a row in a data source (`parent.data_source_id`) or a sub-page (`parent.page_id`).  |
| `updatePage`          | Update a page's properties, icon, cover, parent (move), or trash state (`in_trash`).               |
| `appendBlockChildren` | Append content blocks to the end of a page or block.                                               |
| `updateBlock`         | Update a single block's content or archive it.                                                     |
| `deleteBlock`         | Delete a block (moves it to the trash; reversible).                                                |
| `createDatabase`      | Create a database under a page with an initial data source schema.                                 |
| `updateDatabase`      | Update a database container's title / icon / cover / parent / inline / trash.                      |
| `createDataSource`    | Add a new data source (schema) to an existing database.                                            |
| `updateDataSource`    | Update a data source's schema (add / rename / retype / remove properties).                         |
| `createComment`       | Add a comment to a page or reply to an existing thread.                                            |
| `copyPage`            | Copy a page (title + top-level blocks) from one workspace to another. Uses two Notion connections. |

Run `npx @zapier/notion-connector run <toolName> --help` to see any tool's exact input contract + which auth resolvers are available.

## Usage

`npm install` the package, then call tools from your own TypeScript / Node code. Each named export is the consumer-facing `(input, opts) => Promise<output>`:

```ts
import { search } from "@zapier/notion-connector";

const results = await search(
  { query: "Q4 planning" },
  { connection: `env:NOTION_TOKEN` },
);
```

## MCP Server

Add one stanza to any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) to auto-discover the tools over stdio:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["@zapier/notion-connector", "mcp"],
      "env": {
        "NOTION_TOKEN": "secret_xxx"
      }
    }
  }
}
```

Swap the `NOTION_TOKEN` env var for a `zapier:<connection-id>` connection if you'd rather route through Zapier-managed auth.

## When to use this

- The agent needs **authenticated** access to a real Notion workspace — find, read, create, and edit pages and content, query data-source rows, manage database / data-source schemas, and work with comments.
- You want one artifact that works as an MCP tool, a CLI, or an imported function — without re-implementing each surface.

## When NOT to use this

- **Permanently deleting** content, or deleting a whole database or data source — Notion only trashes (everything is reversible), and the API has no hard delete or container-delete.
- **Workspace administration** — inviting members, changing roles / permissions, or managing database views. The user tools here are read-only and views aren't exposed by the API.

## Links

- [`SKILL.md`](SKILL.md) — agent-runtime guidance: when to reach for each tool, the auth model, disambiguation + refusals.
- [Notion API reference](https://developers.notion.com/reference/intro).
- [Source](https://github.com/zapier/connectors/tree/main/apps/notion).

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Notion's API, services, data, schemas, documentation, or other materials, which remain the property of Notion. Your use of Notion's API is governed by your own agreement with Notion.

**Trademarks and affiliation.** Notion and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Notion.

**Your responsibility.** This connector calls Notion's API using credentials you supply. You are responsible for holding a valid Notion account, for complying with Notion's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Notion product. Zapier is not responsible for changes Notion makes to its API or for any consequence of your use of Notion's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
