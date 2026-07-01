# Repository instructions for agents

This repository is a **catalog of agent-callable tools** for a growing set of the apps Zapier integrates with. Each folder under [`apps/`](apps/) is one connector: simultaneously an [agentskills.io](https://agentskills.io/specification) skill and a set of [MCP `Tool`](https://modelcontextprotocol.io/specification/2025-06-18/schema#tool)-shaped TypeScript modules. If you are an agent, your job here is to **find the connector you need and call it** — not to build or modify this repo. Browse [`apps/`](apps/) for what's currently available; the catalog grows over time and isn't the full set of Zapier integrations.

> **Status: prototype (`0.x`).** Treat nothing here as a stable contract. Breaking changes ship as a minor bump, features and fixes as a patch. Pin with a caret (`^0.x.y`). Licensed under the [Elastic License 2.0](./LICENSE).

## What this repo is (and isn't)

- **It's a published, source-available catalog** so agents and developers can discover and use connectors. Browse [`apps/`](apps/) to see what's available.
- **It's not the development source.** This is a read-only mirror of a subset of a larger upstream repository. Files here (including this one) are published from upstream, so changes made directly on this repo aren't persisted. The build tooling, shared packages, and contributor workflow are not here by design. Don't look for a root build, a `packages/` directory, or a way to compile the whole repo — none of that is mirrored.
- **External contributions aren't accepted through this repo yet.** Don't open PRs expecting review. Consume a connector as a dependency instead of editing it here.

## How to use a connector

Each connector is one folder that works four ways. Pick the one that fits the caller. Full per-connector docs live in each folder's `SKILL.md` and `README.md` (e.g. [`apps/notion/SKILL.md`](apps/notion/SKILL.md)).

1. **Install as an agentskills.io skill** in a compatible client (Cursor, Claude Code, Codex, Copilot, Gemini CLI, Goose, and others). The agent reads `SKILL.md` and either runs the connector's scripts directly or uses them plus `references/` as recipes.
2. **Add as an npm dependency** in your own TypeScript/Node code:
   ```ts
   import notion from "@zapier/notion-connector";
   const result = await notion.scripts.search.run(
     { query: "Q4 planning" },
     { connection: "env:NOTION_TOKEN" },
   );
   ```
3. **Call as a CLI** — `echo '{...}' | npx @zapier/<app>-connector run <script>`. Reads JSON on stdin/argv, prints the upstream response. Good for cron, CI, shells.
4. **Run as a local MCP server** — `npx @zapier/<app>-connector mcp` exposes every script as an MCP tool over stdio, and the connector's `SKILL.md` + `references/*.md` as MCP resources.

Node 22.18+ runs the TypeScript directly (`npm install` the connector's deps first); Bun auto-installs on first run.

## Auth

Pass auth as one `[<resolver>:]<value>` connection string per slot:

- `env:NOTION_TOKEN` — reads the token from that environment variable (direct mode, your own credentials).
- `zapier:<connection-id>` — routes through Zapier-managed auth (recommended; find IDs with the Zapier SDK).
- a bare value — claimed by the first matching resolver (a UUID → `zapier`, a known env-var name → `env`).

Each connector's `SKILL.md` documents its scripts, auth modes, and the trade-offs between direct and Zapier-managed connections.

## Connector layout

Every folder under `apps/` follows the same shape:

- **`SKILL.md`** — the agent-facing contract: what the connector does, its scripts, auth, and setup. Start here.
- **`README.md`** — human-readable overview and examples.
- **`scripts/`** — one file per tool; each default-exports a `ToolDefinition`.
- **`references/`** — supporting docs the connector can use as recipes.
- **`package.json`** — the published `@zapier/<app>-connector` package.
- **`tests/`, `evals/`** — behavior tests and evals for the connector.

To find a tool: open the connector folder, read `SKILL.md`, then call the script you need via one of the four methods above.

When you install a connector as a skill or add it as a package, its `SKILL.md` travels with it and is the contract for using it. This repo-level file only orients agents browsing the catalog — it does not travel with an individual connector.
