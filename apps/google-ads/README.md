# @zapier/google-ads-connector

_Independent, unofficial connector for Google Ads. Not affiliated with, endorsed by, or sponsored by Google Ads. "Google Ads" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable Google Ads tools — search campaigns, ad groups, and ads via GAQL, build performance reports, manage campaign status and budgets, and set up conversion tracking. Use when the user mentions Google Ads or wants to read or manage advertising campaigns, budgets, or reporting — even if they don't name Google Ads explicitly.

It wraps the [Google Ads REST API](https://developers.google.com/google-ads/api/rest/overview) (v23). Reads run as GAQL (Google Ads Query Language) queries; writes go through the per-resource mutate endpoints. Capabilities span account-hierarchy navigation, reading campaigns / ad groups / ads, performance reporting, and managing campaign status, budgets, and conversion actions. Auth is Google OAuth 2.0 (the `adwords` scope) plus an app-level developer token — both supplied by Zapier-managed auth, or directly via two env vars.

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## Install

```bash
# Run a tool with zero install — npx fetches the package on first use
GOOGLE_ADS_ACCESS_TOKEN=xxx GOOGLE_ADS_DEVELOPER_TOKEN=yyy \
  npx @zapier/google-ads-connector run <toolName> '{ ... }' --connection env:GOOGLE_ADS

# Install as a dependency to import the tools in your own code
npm install @zapier/google-ads-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill google-ads
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment — store the id in `GOOGLE_ADS_ZAPIER_CONNECTION_ID`), and `--connection env:GOOGLE_ADS` reads a direct token pair from `$GOOGLE_ADS_ACCESS_TOKEN` (a current OAuth access token for the `adwords` scope) and `$GOOGLE_ADS_DEVELOPER_TOKEN` (your Google Ads API developer token) — the secrets stay in `env`, never on argv. The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

## Tools

| Tool                      | Description                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `listAccessibleCustomers` | List the accounts the connection can directly access (the account-resolution entry point). |
| `listCustomerClients`     | List the client (operating) accounts beneath a manager account.                            |
| `search`                  | Run an arbitrary GAQL query — the full read surface.                                       |
| `listSearchableFields`    | List the selectable / filterable / sortable fields for a resource.                         |
| `listCampaigns`           | List campaigns with status, channel type, budget, and dates.                               |
| `listAdGroups`            | List ad groups, optionally scoped to one campaign.                                         |
| `listAds`                 | List ads, optionally scoped to one ad group.                                               |
| `listConversionActions`   | List the conversion actions configured on the account.                                     |
| `getReport`               | Build a performance report: resource + metrics + segments over a date range.               |
| `setCampaignStatus`       | Pause, enable, or remove a campaign.                                                       |
| `createCampaignBudget`    | Create a daily campaign budget (amount in micros).                                         |
| `updateCampaignBudget`    | Update an existing budget's amount, name, or delivery method.                              |
| `createConversionAction`  | Create a conversion action (e.g. `UPLOAD_CLICKS` for offline tracking).                    |

Run `npx @zapier/google-ads-connector run <toolName> --help` to see any tool's exact input contract + the available resolvers.

## Usage

```ts
import { listCampaigns } from "@zapier/google-ads-connector";

// Each named export is the consumer-facing (input, opts) => Promise<{ data, meta }>.
// Pass auth as one `[<resolver>:]<value>` string, e.g. { connection: "env:GOOGLE_ADS" }.
const { data } = await listCampaigns(
  { customerId: "1234567890", status: "ENABLED" },
  { connection: "env:GOOGLE_ADS" },
);
// data.results -> [{ id, name, status, campaign_budget, ... }], data.next_page_token
```

## MCP Server

Add one stanza to any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) to auto-discover the tools over stdio:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "google-ads": {
      "command": "npx",
      "args": ["@zapier/google-ads-connector", "mcp", "--connection", "zapier:<connection-id>"],
    }
  }
}
```

No Zapier account? Use the `env:` resolver — point `--connection` at the `GOOGLE_ADS` env prefix and keep the tokens in `env`: `"args": ["@zapier/google-ads-connector", "mcp", "--connection", "env:GOOGLE_ADS"]` with `"env": { "GOOGLE_ADS_ACCESS_TOKEN": "xxx", "GOOGLE_ADS_DEVELOPER_TOKEN": "yyy" }`.

## When to use this

- Reading and reporting on a Google Ads account: list campaigns / ad groups / ads, run arbitrary GAQL queries, or build metric reports over a date range.
- Lightweight campaign management: pause / enable / remove a campaign, create or adjust a daily budget.
- Setting up conversion tracking: list or create conversion actions.

## When NOT to use this

- **Uploading offline conversions or Customer Match audience members** — Google routes new API integrations to the separate Data Manager API for those; this connector does not cover them.
- **Building full campaigns, keywords, targeting criteria, or ad creatives** — out of scope; this connector manages campaign status and budgets, not campaign construction.
- **Bulk data export / warehousing** — for large historical pulls, use the Google Ads API client libraries directly with `searchStream`.

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Google Ads API docs](https://developers.google.com/google-ads/api/rest/overview) — the vendor REST API this connector wraps
- [Source](https://github.com/zapier/connectors/tree/main/apps/google-ads)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Google Ads's API, services, data, schemas, documentation, or other materials, which remain the property of Google Ads. Your use of Google Ads's API is governed by your own agreement with Google Ads.

**Trademarks and affiliation.** Google Ads and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Google Ads.

**Your responsibility.** This connector calls Google Ads's API using credentials you supply. You are responsible for holding a valid Google Ads account, for complying with Google Ads's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Google Ads product. Zapier is not responsible for changes Google Ads makes to its API or for any consequence of your use of Google Ads's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
