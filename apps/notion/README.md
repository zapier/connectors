# @zapier/notion-connector

Search Notion workspaces, create rows in Notion databases, and copy pages between workspaces — three agent-callable tools wrapping the [Notion REST API](https://developers.notion.com/reference/intro). Auth is delegated to a Zapier connection (recommended; no third-party secret enters the agent's environment) or to a Notion integration token (fallback).

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## Use it

Ordered by lowest → highest setup burden. Pick the first shape that fits your runtime.

### 1. As a CLI (zero install)

`npx` fetches the package on first use, so there's nothing to install up front. The connector ships a single bin that dispatches to per-script execution and the MCP server:

```bash
# Run one script
NOTION_TOKEN=secret_xxx npx @zapier/notion-connector run search '{"query":"Q4"}'

# Boot as an MCP server over stdio (used by the next shape)
NOTION_TOKEN=secret_xxx npx @zapier/notion-connector mcp

# Discover the surface
npx @zapier/notion-connector --help
npx @zapier/notion-connector run search --help   # per-script env vars
```

Credentials are **environment-variable only** — `npx @zapier/notion-connector` never reads secrets from argv (which would leak through shell history, `ps`, audit logs, and CI runner echoes). Replace `NOTION_TOKEN` with `NOTION_ZAPIER_CONNECTION_ID=<id>` to route through Zapier-via-Relay; see [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

### 2. As an [Agent Skill](https://agentskills.io/)

If your agent supports the [Agent Skills](https://agentskills.io/) standard, install the connector as a skill in one command:

```bash
npx skills zapier/connectors --skill notion
```

`npx skills` is the canonical installer; the `zapier/connectors --skill notion` argument shape works with any [Agent Skills](https://agentskills.io/) installer that resolves GitHub-hosted skills. Once installed, the agent reads [`SKILL.md`](SKILL.md) for runtime guidance — when to reach for each tool, what each one does, and how to find a Zapier connection ID with `npx @zapier/zapier-sdk-cli`.

### 3. As an MCP server

Add one stanza to any MCP-aware client (Claude Desktop, Cursor, Claude Code, Codex, …) to auto-discover the connector's tools over stdio:

<!-- prettier-ignore -->
```jsonc
// claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["@zapier/notion-connector", "mcp"],
      "env": {
        "NOTION_ZAPIER_CONNECTION_ID": "<connection-id>"
      }
    }
  }
}
```

Same `npx` invocation as the CLI's `mcp` subcommand — the only added cost is editing the client's MCP config. Swap `NOTION_ZAPIER_CONNECTION_ID` for `NOTION_TOKEN` if you don't have a Zapier account.

### 4. As importable functions

`npm install` the package, then chain tool calls from your own TypeScript / Node code:

```bash
npm install @zapier/notion-connector
```

Each named export is the consumer-facing `(input, opts) => Promise<output>`:

```ts
import { search, createDatabaseItem } from "@zapier/notion-connector";

const results = await search(
  { query: "Q4 planning" },
  { connection: { TOKEN: process.env.NOTION_TOKEN! } },
);

const created = await createDatabaseItem(
  {
    databaseId: "<uuid>",
    properties: { Title: { title: [{ text: { content: "New row" } }] } },
  },
  { connection: { TOKEN: process.env.NOTION_TOKEN! } },
);
```

Or import the connector default for the structured shape (`scripts`, `toMcpServerTool`, `toMcpTool`, `buildRunOptionsFromEnv`, …):

```ts
import notion from "@zapier/notion-connector";

const opts = notion.buildRunOptionsFromEnv(notion.scripts.search, process.env);
const results = await notion.scripts.search.run({ query: "Q4 planning" }, opts);
```

## Tools

| Tool name              | Default export       | What it does                                                                                                                                                  |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search`               | `search`             | Search Notion pages and databases by query string. Returns matching items with metadata (id, title, parent, url, last_edited_time).                           |
| `create_database_item` | `createDatabaseItem` | Add a row (page) to a Notion database. `properties` keys + types depend on the database schema; use `createDatabaseItem.inputDependencies` to discover them.  |
| `copy_page`            | `copyPage`           | Copy a Notion page from one workspace to another. Multi-connection — set credentials per slot with `SOURCE_*` and `TARGET_*` env-var prefixes (see `--help`). |

Each tool's `inputSchema` / `outputSchema` is the source of truth for its contract. The bundled CLI's `--help` and the MCP `tools/list` response both surface them.

## When to use this connector

- The agent needs **authenticated** access to a real Notion workspace and you want auth delegated to Zapier (one OAuth, no per-page sharing dance) or to a Notion integration token under the agent's control.
- You want one artifact that works as an MCP tool, a CLI, or an imported function — without re-implementing each surface.

## When _not_ to use this connector

- The agent only needs to read public Notion pages without auth (use `fetch` directly).
- You need Notion operations beyond the three tools listed above (page-block manipulation, comment threads, user / workspace admin) — extend this connector by dropping new `scripts/<tool>.ts` files, or follow the same shape in an adjacent connector.

## Links

- Agent-runtime instructions: [`SKILL.md`](SKILL.md) — when to reach for each tool, the auth tradeoffs, and how to find a Zapier connection ID with `npx @zapier/zapier-sdk-cli`.
- Notion API quirks worth knowing: [`references/notion-api-gotchas.md`](references/notion-api-gotchas.md).
- Notion REST API reference: <https://developers.notion.com/reference/intro>.
- Contributing (tests, evals, repo conventions, MR checklist): <https://github.com/zapier/connectors/blob/main/CONTRIBUTING.md>.
