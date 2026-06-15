# @zapier/notion-connector

Search Notion workspaces, create rows in Notion databases, and copy pages between workspaces — three agent-callable tools wrapping the [Notion REST API](https://developers.notion.com/reference/intro). Auth is delegated to a Zapier connection (recommended; no third-party secret enters the agent's environment) or to a Notion integration token (fallback).

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

> [!NOTE]
> **For human readers only — agents should skip this note.** This package is experimental and published for internal testing; APIs may change between minor versions without notice.

## Install

```bash
# Run a tool with zero install — npx fetches the package on first use
NOTION_TOKEN=secret_xxx npx @zapier/notion-connector run search '{"query":"Q4"}'

# Boot as an MCP server over stdio
NOTION_TOKEN=secret_xxx npx @zapier/notion-connector mcp

# Install as a dependency to import the tools in your own code
npm install @zapier/notion-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill notion

# Discover the surface
npx @zapier/notion-connector --help
npx @zapier/notion-connector run search --help   # per-script input + auth env vars
```

Credentials are environment-variable only (never passed on argv, which would leak through shell history, `ps`, and CI logs). Use `NOTION_ZAPIER_CONNECTION_ID=<id>` instead of `NOTION_TOKEN` to route through Zapier-managed auth (recommended; no third-party secret enters the agent's environment); see [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

Once the package is on disk, every script in `scripts/` is also directly executable via its shebang — no `npx` round-trip:

```bash
NOTION_TOKEN=secret_xxx ./scripts/search.ts '{"query":"Q4"}'
```

Requires Node.js 22.18+ or Bun 1.x on `PATH`.

## Tools

| Tool name              | Default export       | What it does                                                                                                                                                  |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search`               | `search`             | Search Notion pages and databases by query string. Returns matching items with metadata (id, title, parent, url, last_edited_time).                           |
| `create_database_item` | `createDatabaseItem` | Add a row (page) to a Notion database. `properties` keys + types depend on the database schema; discover the database's property names and types first.       |
| `copy_page`            | `copyPage`           | Copy a Notion page from one workspace to another. Multi-connection — set credentials per slot with `SOURCE_*` and `TARGET_*` env-var prefixes (see `--help`). |

Each tool's `inputSchema` / `outputSchema` is the source of truth for its contract; the CLI's `--help` and the MCP `tools/list` response both surface them.

## Usage

`npm install` the package, then call tools from your own TypeScript / Node code. Each named export is the consumer-facing `(input, opts) => Promise<output>`:

```ts
import { search, createDatabaseItem } from "@zapier/notion-connector";

const results = await search(
  { query: "Q4 planning" },
  { connection: { TOKEN: process.env.NOTION_TOKEN! } },
);
```

Or import the connector default for the structured shape (`scripts`, `connectionResolvers`, `buildRunOptionsFromEnv`):

```ts
import notion from "@zapier/notion-connector";

const opts = notion.buildRunOptionsFromEnv(notion.scripts.search, process.env);
const results = await notion.scripts.search.run({ query: "Q4 planning" }, opts);
```

## MCP Server

Add one stanza to any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) to auto-discover the connector's tools over stdio:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
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

Swap `NOTION_ZAPIER_CONNECTION_ID` for `NOTION_TOKEN` if you don't have a Zapier account.

## When to use this

- The agent needs **authenticated** access to a real Notion workspace and you want auth delegated to Zapier (one OAuth, no per-page sharing dance) or to a Notion integration token under the agent's control.
- You want one artifact that works as an MCP tool, a CLI, or an imported function — without re-implementing each surface.

## When NOT to use this

- The agent only needs to read public Notion pages without auth (use `fetch` directly).
- You need Notion operations beyond the three tools above (page-block manipulation, comment threads, user / workspace admin) — extend this connector by dropping new `scripts/<tool>.ts` files.

## Links

- [`SKILL.md`](SKILL.md) — agent-runtime guidance: when to reach for each tool, auth tradeoffs, finding a Zapier connection ID.
- [Notion API quirks](references/notion-api-gotchas.md).
- [Notion REST API reference](https://developers.notion.com/reference/intro).
- [Contributing](https://github.com/zapier/connectors/blob/main/CONTRIBUTING.md).
