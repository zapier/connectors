---
name: notion
description: Agent-callable Notion tools for searching pages and databases, reading and creating pages, querying data sources, appending content, and managing schemas. Use when the user mentions Notion or wants to find, read, create, or edit Notion content, even if they don't name Notion explicitly.
license: Elastic-2.0
compatibility: Requires Node.js 22.18+; run `npm install` in this directory first.
metadata:
  title: Notion
  source: https://github.com/zapier/connectors/blob/main/apps/notion/SKILL.md
  zapier-app-key: NotionCLIAPI
  api-docs: https://developers.notion.com/reference/intro
---

# Notion

_Independent, unofficial connector for Notion. Not affiliated with, endorsed by, or sponsored by Notion. "Notion" is a trademark of its owner, used only to identify the service this connector works with._

Tools for working with a Notion workspace against the [Notion API](https://developers.notion.com/reference/intro) (`https://api.notion.com/v1/`, API version `2025-09-03`): find pages and data sources, read and create pages, query data-source rows, append and edit block content, manage database / data-source schemas, read and post comments. 24 scripts across search, read, write, schema, comments, and cross-workspace copy. This version uses Notion's **data sources** model: a _database_ is a container that holds one or more _data sources_, and a _data source_ carries the property schema + the rows (pages).

## When to use this

- An agent needs to **find or read** content — search pages and data sources by title, then read a page, its block body, a data source's schema, or its rows.
- An agent needs to **create or edit** pages and content — add a page (a row in a data source or a sub-page), update properties, append blocks, or edit / delete blocks.
- An agent needs to **query data sources** — filter and sort the rows of a data source, or read a single page property.
- An agent needs to **manage schemas** — create or update databases and data sources (add / rename / retype / remove properties), read or post **comments**.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__notion__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill notion` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

All scripts use the single connection `notion`, except `copyPage`, which uses two slots (`source` + `target`) to copy a page across workspaces.

| Script                                                             | Script name           | Connections        | Description                                                                                       |
| ------------------------------------------------------------------ | --------------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| [`scripts/search.ts`](scripts/search.ts)                           | `search`              | `notion`           | Search pages and data sources by title (the id-resolution entry point).                           |
| [`scripts/getPage.ts`](scripts/getPage.ts)                         | `getPage`             | `notion`           | Retrieve a page's metadata + property values by id.                                               |
| [`scripts/getDatabase.ts`](scripts/getDatabase.ts)                 | `getDatabase`         | `notion`           | Retrieve a database container and its list of data sources.                                       |
| [`scripts/getDataSource.ts`](scripts/getDataSource.ts)             | `getDataSource`       | `notion`           | Retrieve a data source's property schema (names, types, options).                                 |
| [`scripts/queryDataSource.ts`](scripts/queryDataSource.ts)         | `queryDataSource`     | `notion`           | Query the rows (pages) of a data source with filter / sorts.                                      |
| [`scripts/getBlockChildren.ts`](scripts/getBlockChildren.ts)       | `getBlockChildren`    | `notion`           | List the child blocks (body content) of a page or block.                                          |
| [`scripts/getBlock.ts`](scripts/getBlock.ts)                       | `getBlock`            | `notion`           | Retrieve a single block by id.                                                                    |
| [`scripts/getPageAsMarkdown.ts`](scripts/getPageAsMarkdown.ts)     | `getPageAsMarkdown`   | `notion`           | Retrieve a page's body content as Markdown.                                                       |
| [`scripts/getPageProperty.ts`](scripts/getPageProperty.ts)         | `getPageProperty`     | `notion`           | Retrieve a single (paginated) page property value.                                                |
| [`scripts/listComments.ts`](scripts/listComments.ts)               | `listComments`        | `notion`           | List unresolved comments on a page or block.                                                      |
| [`scripts/listUsers.ts`](scripts/listUsers.ts)                     | `listUsers`           | `notion`           | List workspace users (members + bots).                                                            |
| [`scripts/getUser.ts`](scripts/getUser.ts)                         | `getUser`             | `notion`           | Retrieve a single user by id.                                                                     |
| [`scripts/getBotUser.ts`](scripts/getBotUser.ts)                   | `getBotUser`          | `notion`           | Retrieve the bot user for the current token (integration identity).                               |
| [`scripts/createPage.ts`](scripts/createPage.ts)                   | `createPage`          | `notion`           | Create a page: a row in a data source (`parent.data_source_id`) or a sub-page (`parent.page_id`). |
| [`scripts/updatePage.ts`](scripts/updatePage.ts)                   | `updatePage`          | `notion`           | Update a page's properties, icon, cover, parent (move), or trash state (`in_trash`).              |
| [`scripts/appendBlockChildren.ts`](scripts/appendBlockChildren.ts) | `appendBlockChildren` | `notion`           | Append content blocks to the end of a page or block.                                              |
| [`scripts/updateBlock.ts`](scripts/updateBlock.ts)                 | `updateBlock`         | `notion`           | Update a single block's content or archive it.                                                    |
| [`scripts/deleteBlock.ts`](scripts/deleteBlock.ts)                 | `deleteBlock`         | `notion`           | Delete a block (moves it to the trash; reversible).                                               |
| [`scripts/createDatabase.ts`](scripts/createDatabase.ts)           | `createDatabase`      | `notion`           | Create a database under a page with an initial data source schema.                                |
| [`scripts/updateDatabase.ts`](scripts/updateDatabase.ts)           | `updateDatabase`      | `notion`           | Update a database container's title / icon / cover / parent / inline / trash.                     |
| [`scripts/createDataSource.ts`](scripts/createDataSource.ts)       | `createDataSource`    | `notion`           | Add a new data source (schema) to an existing database.                                           |
| [`scripts/updateDataSource.ts`](scripts/updateDataSource.ts)       | `updateDataSource`    | `notion`           | Update a data source's schema (add / rename / retype / remove properties).                        |
| [`scripts/createComment.ts`](scripts/createComment.ts)             | `createComment`       | `notion`           | Add a comment to a page or reply to an existing thread.                                           |
| [`scripts/copyPage.ts`](scripts/copyPage.ts)                       | `copyPage`            | `source`, `target` | Copy a page (title + top-level blocks) from one workspace to another. Two Notion connections.     |

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

The script needs a single Notion **bearer token**, resolved into the one `notion` connection slot. Two resolvers:

- **`env:<ENV_VAR>`** — direct mode. Read the Notion token from the named environment variable (conventionally `env:NOTION_TOKEN`, with the token exported in `NOTION_TOKEN`; the token stays in `env`, never on argv). The token is either an **internal-integration secret** (from <https://www.notion.so/profile/integrations>) or a **public-integration OAuth access token**.
- **`zapier:<connection-id>`** — Zapier-managed auth. Route through a Zapier Notion connection; the Zapier auth / retries / governance layer injects the token for you. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>, ~1 minute). Find the ID with the Zapier SDK CLI: `npx @zapier/zapier-sdk-cli list-connections NotionCLIAPI` (run `login` first if unauthenticated; add `--json` for machine output).

**Capabilities gating + per-resource sharing.** A Notion token is scoped by the integration's **[capabilities](https://developers.notion.com/reference/capabilities)** (read content, update content, insert content, read/insert comments, user information with or without email) — these "enforce which API endpoints a connection or token can call, and what content and user related information they are able to see," so a call outside the granted capabilities is rejected even with a valid token. The user-information capability also controls whether `getUser` / `listUsers` return email addresses. Separately, the integration only sees resources **explicitly shared with it**: a valid token still returns `404` for any page, database, or data source that hasn't been shared with the integration in Notion's UI. If a read 404s on an id you believe exists, the resource almost certainly isn't shared yet.

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

## Disambiguation & refusals

**Disambiguation before a write.** Before writing to a page or row you looked up by name (e.g. update a page found via `search`, or a row found via `queryDataSource`), count the **exact case-insensitive title matches**:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (`parent`, `url`, or `last_edited_time`) and ask the user which one they mean. Don't pick arbitrarily and don't write to all of them.

**Unsupported operations — say so and stop; don't fake it with another tool.** This catalog deliberately does not:

- **Permanently delete** anything. Everything is trash / restore — pages via `updatePage` `in_trash`, blocks via `deleteBlock` (reversible). There is no hard delete.
- **Delete a whole database or data source.** There is no tool for it. Don't substitute trashing every row to simulate it.
- **Manage workspace members or permissions** (inviting users, changing roles, sharing). `listUsers` / `getUser` are read-only.
- **Create or manage database views.** Views aren't exposed by the API.

If asked for any of these, tell the user it's unsupported and stop — don't reach for an unrelated tool to approximate it.

## API quirks worth knowing

Load the matching reference file before working in that area:

| Reference                                                              | Covers                                                                                                                                                                                                                   | Load it when                                                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| [`references/notion-api-gotchas.md`](references/notion-api-gotchas.md) | Versioning + the 2025-09-03 data-sources model, auth/sharing, the error envelope + code table, rate limits, size limits, pagination, ID/URL formats, archive/trash, search-matches-titles-only, 25-reference truncation. | Debugging an error or a `404`, paginating a list, resolving an id, or reasoning about the database vs data-source split. |
| [`references/notion-blocks.md`](references/notion-blocks.md)           | The typed block object, common block types, the `rich_text` shape, appending children (limits + nesting), why `updateBlock` can't change a block's type.                                                                 | Building or editing page content — `appendBlockChildren`, `createPage` (`children`), `updateBlock`.                      |
| [`references/notion-properties.md`](references/notion-properties.md)   | The property-schema object + type list, and the per-type page property **value** shapes.                                                                                                                                 | Defining a schema (`createDatabase`, `createDataSource`) or writing property values (`createPage`, `updatePage`).        |
| [`references/notion-query.md`](references/notion-query.md)             | The `filter` object (single + compound `and`/`or`), per-type conditions, the `sorts` array, the 10,000-result ceiling.                                                                                                   | Calling `queryDataSource` with a filter or sort.                                                                         |
