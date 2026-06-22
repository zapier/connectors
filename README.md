# Zapier Connectors

> [!NOTE]
> **Status: prototype.** First-cohort connectors are being written to validate the artifact shape against eval, installation and consumption from various agent harnesses. **Treat nothing here as a stable contract.** Pre-1.0 (`0.x`): breaking changes ship as a minor bump, features and fixes as a patch. Pin with a caret (`^0.x.y`) so you don't pick up a breaking minor automatically. Licensed under the [Elastic License 2.0](./LICENSE).

A growing catalog of agent-callable tools for the 9k+ apps Zapier integrates with. Each tool is **simultaneously** an [agentskills.io](https://agentskills.io/specification)-compliant skill artifact and an [MCP `Tool`](https://modelcontextprotocol.io/specification/2025-06-18/schema#tool)-shaped TypeScript module. The combined shape is the contribution: neither standard defines it alone.

The catalog is designed to run **anywhere**:

- as installable agentskills.io skills in any compatible client (Cursor, Claude Code, Codex, Copilot, VS Code, Gemini CLI, Goose, OpenCode, …)
- as native MCP tools registered into any MCP server's `tools/list`
- inside Zapier surfaces (Sidekick, the Zapier MCP server, code-based Zaps) — Zapier is the _easy_ path, not the only path
- outside Zapier with user-held credentials via each connector's declared `connectionResolvers`

## Using a connector

A connector is one folder, many surfaces. The same `apps/notion/` artifact is simultaneously an agentskills.io **skill**, a publishable **npm package** with a bundled **CLI**, a set of MCP **`Tool`** descriptors, and typed **Node modules** (each script default-exporting a `ToolDefinition`). There are four ways to reach for it:

1. **Install as an agentskills.io skill** in a compatible AI client — Cursor, Claude Code, Codex, Copilot, Goose, and ~40 others. The agent reads `SKILL.md` and either (a) executes the connector's scripts directly when a task calls for it, or (b) uses the scripts + `references/` as recipes when generating code.
2. **Add as a dependency** in your own TypeScript / Node code. Named imports give each script's wrapped `.run(input, opts)`; the default import adds the structured object (`scripts`, `connectionResolvers`) for direct in-process calls. Pass auth as one `[<resolver>:]<value>` string: `{ connection: "env:NOTION_TOKEN" }` (or `{ connections: { <slot>: ... } }` for multi-slot scripts).
3. **Call as a CLI** — `echo '{...}' | npx @zapier/notion-connector run <script>` parses JSON on stdin/argv and prints the upstream API response. Cron, GitHub Actions, Terraform, anything that shells out.
4. **Run as a local MCP server** via the bundled CLI — `npx @zapier/notion-connector mcp` exposes every script as a native MCP tool over stdio, and the connector's `SKILL.md` + `references/*.md` as MCP resources, no consumer code required.

Each connector documents its own scripts, auth modes, and setup in its own `README.md` (e.g. [`apps/notion/README.md`](apps/notion/README.md)).

### In your own code

```ts
import notion from "@zapier/notion-connector";

const result = await notion.scripts.search.run(
  { query: "Q4 planning" },
  { connection: "env:NOTION_TOKEN" },
);

// Or import one script's run function when you already know the name:
import { search } from "@zapier/notion-connector";
await search({ query: "Q4 planning" }, { connection: "env:NOTION_TOKEN" });
```

Auth is one `[<resolver>:]<value>` connection string per slot — `env:NOTION_TOKEN` reads the token from `process.env.NOTION_TOKEN`, `zapier:<connection-id>` routes through Zapier-managed auth, and a bare value is claimed by the first matching resolver.

### Running a tool locally

This is what way 1 does under the hood, and — swapping `node <script>` for `npx @zapier/notion-connector run <script>` — also what way 3 (the CLI) does from the published package. Each script takes JSON on stdin or `argv[1]` and resolves auth from a `--connection [<resolver>:]<value>` flag against the connector's resolvers. The connection value is a _selector_ (an env-var name or a connection id), not the secret itself, so it's safe to pass on argv; the `env:` resolver still reads the actual token from the named environment variable. Auth via a Zapier connection is the recommended path; direct mode is the fallback for callers who don't want a Zapier dep:

```bash
# With Zapier — Zapier connection UUID, auth handled by Zapier (recommended)
# Find a connection UUID with: zapier-sdk list-connections notion
echo '{"query":"foo"}' | node apps/notion/scripts/search.ts --connection zapier:<connection-id>

# Direct mode — your own 3P credentials (no Zapier needed); the token stays in env
echo '{"query":"foo"}' | NOTION_TOKEN=secret_xxx node apps/notion/scripts/search.ts --connection env:NOTION_TOKEN

# The `<resolver>:` prefix is optional — a bare value goes to the first resolver
# that claims it (a UUID → `zapier`, a set env-var name → `env`):
echo '{"query":"foo"}' | node apps/notion/scripts/search.ts --connection <connection-id>

# From the published package, `node <script>` becomes the bundled CLI (way 3) —
# same stdin/argv + `--connection` contract, no checkout needed:
echo '{"query":"foo"}' | npx @zapier/notion-connector run search --connection env:NOTION_TOKEN

# Run with `--help` to see each script's input schema and available resolvers:
node apps/notion/scripts/search.ts --help
```

The connector's `SKILL.md` describes the trade-offs between the two modes (setup steps, where the third-party credential lives, how revocation works).

Node (22.18+) runs the TypeScript directly — `npm install` the connector's deps first. Bun works too and auto-installs deps on first run.
