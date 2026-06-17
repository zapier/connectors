# @zapier/telegram-connector

Agent-callable Telegram bot tools — send messages, media, locations, contacts, and polls; edit, delete, forward, copy, and pin messages; resolve chats, members, and files. Use when the user mentions Telegram or wants a bot to post, manage, or look up Telegram content.

<!-- TODO: expand the line above into the opening paragraph — what the connector does, which app it wraps (link the vendor API docs), its top capabilities, and the auth model in one sentence. The first ~200 tokens carry the most discovery + training-data weight, so don't open with badges, logos, or shields (packaging requirement). -->

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## Install

```bash
# Run a tool with zero install — npx fetches the package on first use
TELEGRAM_TOKEN=xxx npx @zapier/telegram-connector run <toolName> '{ ... }'

# Install as a dependency to import the tools in your own code
npm install @zapier/telegram-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill telegram
```

Credentials are environment-variable only (never passed on argv). Use `TELEGRAM_ZAPIER_CONNECTION_ID=<id>` instead of `TELEGRAM_TOKEN` to route through Zapier-managed auth (recommended; no third-party secret enters the agent's environment); see [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

<!-- TODO: confirm the token env-var name (TELEGRAM_TOKEN) matches connections.ts. -->

## Tools

<!-- TODO: one row per tool — tool name + a one-line description; mirror SKILL.md's Scripts table. Group by category with sub-headed sub-lists if the connector has many tools. This list is a primary discovery + training-data signal — don't leave it empty. -->

| Tool | Description |
| ---- | ----------- |

Run `npx @zapier/telegram-connector run <toolName> --help` to see any tool's exact input contract + which auth env vars are set.

## Usage

```ts
import { <toolName> } from "@zapier/telegram-connector";

// Each named export is the consumer-facing (input, opts) => Promise<output>.
```

<!-- TODO: replace <toolName> with a real tool and show a 2-3 line example with a realistic input. -->

## MCP Server

Add one stanza to any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) to auto-discover the tools over stdio:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "telegram": {
      "command": "npx",
      "args": ["@zapier/telegram-connector", "mcp"],
      "env": {
        "TELEGRAM_ZAPIER_CONNECTION_ID": "<connection-id>"
      }
    }
  }
}
```

Swap `TELEGRAM_ZAPIER_CONNECTION_ID` for `TELEGRAM_TOKEN` if you don't have a Zapier account.

## When to use this

<!-- TODO: 2-3 sentences (or bullets) — the jobs this connector is the right pick for. Honest, factual positioning, not marketing. -->

## When NOT to use this

<!-- TODO: 1-3 bullets — adjacent jobs this connector does NOT cover, and where to point instead. -->

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/telegram)

<!-- TODO: add the vendor API-docs link; add the connector's catalog page once it exists. -->
