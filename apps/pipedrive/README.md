# @zapier/pipedrive-connector

_Independent, unofficial connector for Pipedrive. Not affiliated with, endorsed by, or sponsored by Pipedrive. "Pipedrive" is a trademark of its owner, used only to identify the service this connector works with._

50 agent-callable tools for the Pipedrive CRM: create, read, update, search, and delete deals, persons, organizations, activities, leads, products, and notes, plus the pipeline / stage / user / currency / activity-type and custom-field metadata an agent needs to fill those records out. Wraps the [Pipedrive REST API](https://developers.pipedrive.com/docs/api/v1) (v2-first, with v1 for surfaces that have no v2 equivalent yet). Auth is delegated to a Zapier connection (recommended; no third-party secret enters the agent's environment) or to a Pipedrive API token (fallback).

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

This package is experimental and published for internal testing; APIs may change between minor versions without notice.

## Install

```bash
# Run a tool with zero install - npx fetches the package on first use
PIPEDRIVE_TOKEN=xxx npx @zapier/pipedrive-connector run listDeals '{"limit":5}'

# Boot as an MCP server over stdio
PIPEDRIVE_TOKEN=xxx npx @zapier/pipedrive-connector mcp

# Install as a dependency to import the tools in your own code
npm install @zapier/pipedrive-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill pipedrive

# Discover the surface
npx @zapier/pipedrive-connector --help
npx @zapier/pipedrive-connector run createDeal --help   # per-script input + auth env vars
```

Credentials are environment-variable only (never passed on argv, which would leak through shell history, `ps`, and CI logs). Use `PIPEDRIVE_ZAPIER_CONNECTION_ID=<id>` instead of `PIPEDRIVE_TOKEN` to route through Zapier-managed auth (recommended; no third-party secret enters the agent's environment); see [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

Once the package is on disk, every script in `scripts/` is also directly executable via its shebang, no `npx` round-trip:

```bash
PIPEDRIVE_TOKEN=xxx ./scripts/listDeals.ts '{"limit":5}'
```

Requires Node.js 22.18+ or Bun 1.x on `PATH`.

## Tools

50 tools, grouped by the record they act on. Each is single-connection on `pipedrive`. The full per-tool table (with one-line descriptions) is in [`SKILL.md`](SKILL.md#scripts); each tool's `inputSchema` / `outputSchema` is the source of truth for its contract, surfaced by the CLI's `--help` and the MCP `tools/list` response.

| Group                  | Tools                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deals                  | `listDeals` `createDeal` `getDeal` `updateDeal` `deleteDeal` `searchDeals` `listDealProducts` `addDealProduct` `updateDealProduct` `deleteDealProduct` `listDealParticipants` |
| Persons                | `listPersons` `createPerson` `getPerson` `updatePerson` `searchPersons`                                                                                                       |
| Organizations          | `listOrganizations` `createOrganization` `getOrganization` `updateOrganization` `searchOrganizations`                                                                         |
| Activities             | `listActivities` `createActivity` `getActivity` `updateActivity` `deleteActivity`                                                                                             |
| Leads                  | `listLeads` `createLead` `getLead` `updateLead` `searchLeads`                                                                                                                 |
| Products               | `listProducts` `createProduct` `getProduct` `updateProduct` `searchProducts`                                                                                                  |
| Notes                  | `listNotes` `createNote` `getNote` `updateNote`                                                                                                                               |
| Metadata and discovery | `listPipelines` `listStages` `listUsers` `getUser` `listCurrencies` `listActivityTypes` `listDealFields` `listPersonFields` `listOrganizationFields` `listProductFields`      |

Custom fields on deals, persons, organizations, and products are passed and returned as a `custom_fields` object keyed by Pipedrive's 40-character field hashes; discover valid keys and option ids with the matching `list*Fields` tool. See [`references/pipedrive-api-gotchas.md`](references/pipedrive-api-gotchas.md).

## Usage

`npm install` the package, then call tools from your own TypeScript / Node code. Each named export is the consumer-facing `(input, opts) => Promise<output>`:

```ts
import { listDeals, createDeal } from "@zapier/pipedrive-connector";

const deals = await listDeals(
  { limit: 10, status: "open" },
  { connection: { TOKEN: process.env.PIPEDRIVE_TOKEN! } },
);
```

Or import the connector default for the structured shape (`scripts`, `toMcpServerTool`, `buildRunOptionsFromEnv`, …):

```ts
import pipedrive from "@zapier/pipedrive-connector";

const opts = pipedrive.buildRunOptionsFromEnv(
  pipedrive.scripts.listDeals,
  process.env,
);
const deals = await pipedrive.scripts.listDeals.run({ limit: 10 }, opts);
```

## MCP Server

Add one stanza to any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) to auto-discover the connector's tools over stdio:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "pipedrive": {
      "command": "npx",
      "args": ["@zapier/pipedrive-connector", "mcp"],
      "env": {
        "PIPEDRIVE_ZAPIER_CONNECTION_ID": "<connection-id>"
      }
    }
  }
}
```

Swap `PIPEDRIVE_ZAPIER_CONNECTION_ID` for `PIPEDRIVE_TOKEN` if you don't have a Zapier account.

## When to use this

- The agent needs **authenticated** access to a real Pipedrive account and you want auth delegated to Zapier (one OAuth, no per-record sharing) or to a Pipedrive API token under the agent's control.
- The agent runs sales-CRM workflows: managing deals through a pipeline, keeping contacts and organizations current, logging activities, capturing leads, or attaching products and notes.
- You want one artifact that works as an MCP tool, a CLI, or an imported function, without re-implementing each surface.

## When NOT to use this

- The agent needs event-driven automation (be notified when a deal is won, sync on change). This connector does on-demand reads and writes only, with no triggers or webhooks; use Zapier's trigger surface for that.
- You need an operation outside the 50 tools above (deleting contacts / organizations / notes, merging duplicate records, file attachments). Extend this connector by dropping new `scripts/<tool>.ts` files.

## Links

- [`SKILL.md`](SKILL.md) - agent-runtime guidance: when to reach for each tool, auth tradeoffs, finding a Zapier connection ID.
- [Pipedrive API quirks and custom fields](references/pipedrive-api-gotchas.md).
- [Pipedrive REST API reference](https://developers.pipedrive.com/docs/api/v1).
- [Contributing](https://github.com/zapier/connectors/blob/main/CONTRIBUTING.md).

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Pipedrive's API, services, data, schemas, documentation, or other materials, which remain the property of Pipedrive. Your use of Pipedrive's API is governed by your own agreement with Pipedrive.

**Trademarks and affiliation.** Pipedrive and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Pipedrive.

**Your responsibility.** This connector calls Pipedrive's API using credentials you supply. You are responsible for holding a valid Pipedrive account, for complying with Pipedrive's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Pipedrive product. Zapier is not responsible for changes Pipedrive makes to its API or for any consequence of your use of Pipedrive's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
