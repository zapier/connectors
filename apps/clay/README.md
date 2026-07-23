# @zapier/clay-connector

_Independent, unofficial connector for Clay. Not affiliated with, endorsed by, or sponsored by Clay. "Clay" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for [Clay](https://www.clay.com/), the go-to-market data platform, wrapping its table API ([developer docs](https://developers.clay.com/)). Create and update rows in Clay tables, find rows by field value, list a view's rows, and navigate the workspace → table → view → record hierarchy to resolve the ids those operations need. Authentication is a single long-lived Clay API key, passed as one connection string.

## When to use this

- Writing structured data into Clay tables from an agent or workflow — new rows, or updates to existing ones.
- Looking rows up by a field value, or reading a page of a table view, to retrieve a record and its cells.
- Resolving Clay identifiers (workspace, table, view, field, select-option, and user ids) and table schema so a write or filter can be constructed.

## When NOT to use this

- **Building tables, views, or columns** — schema authoring is done in the Clay app, not via this connector.
- **On-demand enrichment or bulk export** — enrichments run automatically per column when a row lands; there is no request-time "enrich" or full-table export tool here.
- **Deleting rows** — no delete tool is exposed.

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/clay-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/clay-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill clay
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment, and the connection id isn't itself a secret so you can pass it as-is), and `--connection env:<ENV_VAR>` reads a direct token from `$<ENV_VAR>` (the token stays in `env`, never on argv). The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "clay": {
      "command": "npx",
      "args": ["@zapier/clay-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

| Script               | Description                                                                        |
| -------------------- | ---------------------------------------------------------------------------------- |
| `createRecord`       | Add a new row to a Clay table (may run enrichment columns, which consume credits). |
| `updateRecord`       | Update cell values on an existing row; only the keys you include change.           |
| `findRecord`         | Find rows in a table by matching field values (AND-combined).                      |
| `listRecords`        | List a page of rows from a table view.                                             |
| `getTable`           | Describe a table: fields (id, type, select options) and views.                     |
| `listTables`         | List the tables in a workspace.                                                    |
| `listWorkspaces`     | List the workspaces the caller can access.                                         |
| `listWorkspaceUsers` | List members of a workspace (resolve a user id).                                   |
| `getCurrentUser`     | Return the authenticated caller's user id and email.                               |

Run `npx @zapier/clay-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

```ts
import { createRecord } from "@zapier/clay-connector";

const { data } = await createRecord(
  { tableId: "t_abc", cells: { f_company: "Acme", f_website: "acme.com" } },
  { connection: "env:CLAY_API_KEY" },
);
// data => { id: "r_123", cells: { ... } }
```

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

Clay uses a single **API key** (Settings → Account → API keys), sent as the raw value of the `authorization` header — no `Bearer` prefix. There are no scopes; a key carries your account's full API access. Direct mode names the key via the connection string, e.g. `--connection env:CLAY_API_KEY`.

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/clay)
- [Clay developer docs](https://developers.clay.com/)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Clay's API, services, data, schemas, documentation, or other materials, which remain the property of Clay. Your use of Clay's API is governed by your own agreement with Clay.

**Trademarks and affiliation.** Clay and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Clay.

**Your responsibility.** This connector calls Clay's API using credentials you supply. You are responsible for holding a valid Clay account, for complying with Clay's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Clay product. Zapier is not responsible for changes Clay makes to its API or for any consequence of your use of Clay's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
