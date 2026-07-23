# Google Sheets — Claude Code & Codex plugin

_Independent, unofficial connector for Google Sheets. Not affiliated with, endorsed by, or sponsored by Google Sheets. "Google Sheets" is a trademark of its owner, used only to identify the service this connector works with._

This directory packages the [`@zapier/google-sheets-plg-connector`](skills/google-sheets-plg/README.md) connector as an installable **plugin** for [Claude Code](https://code.claude.com/docs/en/plugins) and [Codex](https://developers.openai.com/codex/plugins/build). Installing the plugin gives an agent the Google Sheets connector as both an [Agent Skill](https://agentskills.io/) (progressive, on-demand guidance) and a bundled MCP server (the scripts exposed as tools) in one step.

For what the connector _does_ — the full script catalog, usage, auth model, and API surface — see the connector's own [`skills/google-sheets-plg/README.md`](skills/google-sheets-plg/README.md) and [`SKILL.md`](skills/google-sheets-plg/SKILL.md). This document covers only the plugin wrapper: its shape and how to install it.

> [!WARNING]
> **Experimental — this whole `plugins/**` tree is a pilot.** It's a trial of a new plugin shape/wrapper that nests the connector as a bundled skill + MCP server, distributed through the [`zapier/marketplace`](https://github.com/zapier/marketplace) catalog. Once the shape is proven, it will be folded directly into `apps/**` and this `plugins/**` tree will be **deleted**. Treat paths and the `-plg` suffix here as provisional.

## Plugin shape

The connector is nested as a skill under `skills/`, alongside the two host manifests and a bundled MCP config at the plugin root:

```text
google-sheets-plg/                 # ← the plugin root
├── .claude-plugin/
│   └── plugin.json                # Claude Code manifest → skills + mcpServers
├── .codex-plugin/
│   └── plugin.json                # Codex manifest → skills + mcpServers
├── .mcp.json                      # bundled MCP server (npx the published package)
└── skills/
    └── google-sheets-plg/         # the connector, as an Agent Skill
        ├── SKILL.md               # runtime guidance an agent loads on demand
        ├── scripts/               # the tools (createRow, lookupRow, getValues, …)
        ├── lib/                   # shared helpers
        ├── references/            # deep-dive docs (auth, A1 notation, gotchas)
        ├── cli.js / index.ts      # CLI + importable entry points
        ├── package.json           # the npm package (@zapier/google-sheets-plg-connector)
        └── README.md              # connector docs (start here for what it does)
```

Both host manifests point at the same two things — the skill directory and the MCP config — so a single artifact works across hosts:

- **`skills`: `./skills/`** — every `SKILL.md` under this directory is discovered and made available to the agent. Only `plugin.json` lives inside `.claude-plugin/` / `.codex-plugin/`; every other component (`skills/`, `.mcp.json`) sits at the plugin root, as both hosts require.
- **`mcpServers`: `./.mcp.json`** — starts the connector as an MCP server over stdio so its scripts show up as callable tools:

<!-- prettier-ignore -->
```jsonc
// .mcp.json
{
  "mcpServers": {
    "google-sheets-plg": {
      "command": "npx",
      "args": ["-y", "@zapier/google-sheets-plg-connector", "mcp"]
    }
  }
}
```

Note the MCP server runs the **published** `@zapier/google-sheets-plg-connector` from npm (fetched by `npx` on first use), not the in-tree skill copy — so the plugin needs no local build step to expose its tools.

## Install

Once wired into the marketplace, this plugin installs from the [`zapier/marketplace`](https://github.com/zapier/marketplace) catalog as `google-sheets-plg` — add the marketplace once, then install the plugin. Both hosts share the same `skills` + `mcpServers` wiring (from `.claude-plugin/plugin.json` and its `.codex-plugin/plugin.json` mirror), so the same artifact serves both.

### Claude Code

```bash
# CLI (from your terminal)
claude plugin marketplace add zapier/marketplace
claude plugin install google-sheets-plg@zapier

# …or in-session
/plugin marketplace add zapier/marketplace
/plugin install google-sheets-plg@zapier
```

Prefer to test straight from this checkout, before it's in the catalog? Point Claude Code at the plugin directory when launching:

```bash
claude --plugin-dir /path/to/connectors/plugins/google-sheets-plg
```

Once enabled, the skill loads on demand and the MCP tools appear namespaced under the plugin. Manage it any time with `/plugin`.

### Codex

```bash
codex plugin marketplace add zapier/marketplace
codex plugin add google-sheets-plg@zapier
```

Or install straight from this checkout while iterating:

```bash
codex plugin install ./plugins/google-sheets-plg
```

Start a new thread after installing so Codex picks up the skill and MCP server.

> [!NOTE]
> GitHub Copilot CLI is a third host the `zapier/marketplace` catalog serves, but this plugin ships only Claude Code and Codex manifests — Copilot support needs a `.github/plugin/plugin.json` mirror that doesn't exist yet.

## Auth

Auth is Google OAuth 2.0, passed as one `[<resolver>:]<value>` connection string — `zapier:<connection-id>` (recommended; routes through Zapier-managed auth) or `env:<ENV_VAR>` (a direct token). You can set a default by adding `"--connection", "<value>"` to the `args` in `.mcp.json`, or pass one per tool call. See [`SKILL.md`](skills/google-sheets-plg/SKILL.md#auth) and [`references/use-with-zapier.md`](skills/google-sheets-plg/references/use-with-zapier.md) for how to obtain a connection.

## Links

- [`skills/google-sheets-plg/README.md`](skills/google-sheets-plg/README.md) — the connector: what it does, its scripts, usage, and auth
- [`skills/google-sheets-plg/SKILL.md`](skills/google-sheets-plg/SKILL.md) — runtime guidance for agents
- [`zapier/marketplace`](https://github.com/zapier/marketplace) — the plugin marketplace this installs from
- [Claude Code plugins](https://code.claude.com/docs/en/plugins) · [Codex plugins](https://developers.openai.com/codex/plugins/build) — host plugin docs
- [Source](https://github.com/zapier/connectors/tree/main/plugins/google-sheets-plg)

## Legal

This plugin distributes the `@zapier/google-sheets-plg-connector` connector; the connector's own [README](skills/google-sheets-plg/README.md#legal), [`LICENSE`](skills/google-sheets-plg/LICENSE), and [`NOTICE`](skills/google-sheets-plg/NOTICE) govern its use. Google Sheets and its logos are trademarks of their owner, used here only to identify the service this connector works with; this connector is not affiliated with, endorsed by, or sponsored by Google Sheets. Licensed under the Elastic License 2.0.
