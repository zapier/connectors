# @zapier/dataforseo-connector

_Independent, unofficial connector for DataForSEO. Not affiliated with, endorsed by, or sponsored by DataForSEO. "DataForSEO" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for the [DataForSEO API v3](https://docs.dataforseo.com/v3/) — search-engine, SEO, and AI-search data. The 33 read-only tools cover Google organic SERPs, keyword research (suggestions, related terms, volume, difficulty, intent), domain and traffic analytics, backlink profiles, Google Maps business listings, on-page audits, and AI-search visibility (querying ChatGPT/Claude/Gemini/Perplexity and tracking how brands and domains are mentioned in AI answers). It authenticates with your DataForSEO account login + API password over HTTP Basic (or a Zapier-managed connection).

## When to use this

- You want live SEO / SERP / keyword / backlink data programmatically — for research, reporting, or feeding an agent's analysis.
- You want to measure or monitor **AI-search visibility** — how LLMs answer a query and where a brand or domain shows up in their citations.
- You want Google Maps business-listing data by category or location.

## When NOT to use this

- **Ongoing monitoring / scheduled tasks.** Every tool is a one-shot live query; there's no background job or "track over time." Call again and compare to trend a metric.
- **Full-site crawls.** `auditPage` audits a single URL; this connector does not crawl an entire site.
- **Writing or changing anything.** It's read-only — it retrieves data, it doesn't modify Google properties, websites, or DataForSEO resources.

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use.
# Direct mode is HTTP Basic: set your login + API password, pass the DATAFORSEO prefix.
export DATAFORSEO_LOGIN=you@example.com
export DATAFORSEO_PASSWORD=your-api-password
npx @zapier/dataforseo-connector@latest run getAccountBalance '{}' --connection env:DATAFORSEO

# Install as a dependency to import the functions in your own code
npm install @zapier/dataforseo-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill dataforseo
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection`. The value is a _selector_, not the secret: `--connection zapier:<connection-id>` routes through Zapier-managed auth (recommended; no third-party secret enters the agent's environment, and the connection id isn't itself a secret so you can pass it as-is), and `--connection env:DATAFORSEO` reads `DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` from `env` and sends HTTP Basic (the secrets stay in `env`, never on argv). The `<resolver>:` prefix is optional — a bare value is claimed by the first matching resolver. See [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "dataforseo": {
      "command": "npx",
      "args": ["@zapier/dataforseo-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

## Scripts

**SERP & keywords**

| Script                     | Description                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| `getGoogleOrganicSerp`     | Fetch live parsed Google organic results for a keyword.                         |
| `getKeywordSuggestions`    | Expand a seed keyword into long-tail queries that contain it.                   |
| `getRelatedKeywords`       | Get keywords from Google's "searches related to" block.                         |
| `getKeywordOverview`       | Full metrics (volume, CPC, competition, difficulty, intent) for known keywords. |
| `getKeywordDifficulty`     | Keyword Difficulty (0–100) for up to 1,000 keywords.                            |
| `getSearchVolume`          | Google Ads search volume, CPC, and competition for keywords.                    |
| `getAiKeywordSearchVolume` | Estimated keyword usage volume inside AI tools.                                 |
| `getSearchIntent`          | Classify the search intent of up to 1,000 keywords.                             |

**Domain, traffic & backlinks**

| Script                         | Description                                                        |
| ------------------------------ | ------------------------------------------------------------------ |
| `getRankedKeywords`            | List the keywords a domain or URL ranks for in Google.             |
| `getDomainRankOverview`        | A domain's organic + paid search overview.                         |
| `getOrganicTraffic`            | Estimate current monthly organic traffic for up to 1,000 domains.  |
| `getHistoricalTraffic`         | Estimate monthly organic traffic over the past ~12 months.         |
| `getBacklinksSummary`          | Overview of a single target's backlink profile.                    |
| `getBacklinks`                 | List individual backlinks to a target with anchors and attributes. |
| `getBacklinksBulkPagesSummary` | Backlink counts for up to 1,000 pages/domains at once.             |
| `getReferringDomains`          | Overview of the domains linking to a target.                       |
| `getBacklinkAnchors`           | Anchor texts used in backlinks to a target.                        |

**Local & on-page**

| Script                             | Description                                                          |
| ---------------------------------- | -------------------------------------------------------------------- |
| `searchBusinessListings`           | Search Google Maps business listings by category, name, or location. |
| `getBusinessCategoriesAggregation` | Count Google Maps businesses grouped by category.                    |
| `auditPage`                        | Run an instant on-page SEO audit of a single URL.                    |

**AI search (LLM answers & mentions)**

| Script                            | Description                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| `getChatGptResponse`              | Send a prompt to a ChatGPT model and get its response.                               |
| `getChatGptSearchResults`         | The web results ChatGPT cited for a keyword search, as structured items.             |
| `getChatGptSearchResultsHtml`     | Raw HTML of ChatGPT's search results page for a keyword.                             |
| `getClaudeResponse`               | Send a prompt to a Claude model and get its response.                                |
| `getGeminiResponse`               | Send a prompt to a Gemini model and get its response.                                |
| `getPerplexityResponse`           | Send a prompt to a Perplexity model and get its response.                            |
| `getLlmMentions`                  | Find where brands/domains/keywords are mentioned in AI answers.                      |
| `getLlmMentionsTopPages`          | Rank pages most cited alongside your targets in AI answers.                          |
| `getLlmMentionsTopDomains`        | Rank domains most cited alongside your targets in AI answers.                        |
| `getLlmMentionsAggregatedMetrics` | Aggregate AI-mention metrics (mention counts and AI search volume) for your targets. |
| `getLlmMentionsCrossMetrics`      | AI-mention metrics grouped by custom keys for comparison.                            |

**Account & discovery**

| Script                      | Description                                                          |
| --------------------------- | -------------------------------------------------------------------- |
| `getAccountBalance`         | Account credit balance, plan limits, and rate (also the auth check). |
| `listLocationsAndLanguages` | List the exact location and language names DataForSEO accepts.       |

Run `npx @zapier/dataforseo-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:DATAFORSEO" }`.

```ts
import { getKeywordOverview } from "@zapier/dataforseo-connector";

const { data } = await getKeywordOverview(
  {
    keywords: ["running shoes", "trail running shoes"],
    location_name: "United States",
    language_name: "English",
  },
  { connection: "env:DATAFORSEO" },
);
// data => { items: [{ keyword, search_volume, keyword_difficulty, ... }], items_count, cost }
```

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

DataForSEO uses **HTTP Basic authentication**: your account **login** (email) plus a dedicated **API password** (generated in your DataForSEO dashboard under API access — not your account/dashboard password). There are no scopes; a credential has your account's full API access, metered by credit balance (see `getAccountBalance`).

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/dataforseo)
- [DataForSEO API documentation](https://docs.dataforseo.com/v3/)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in DataForSEO's API, services, data, schemas, documentation, or other materials, which remain the property of DataForSEO. Your use of DataForSEO's API is governed by your own agreement with DataForSEO.

**Trademarks and affiliation.** DataForSEO and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by DataForSEO.

**Your responsibility.** This connector calls DataForSEO's API using credentials you supply. You are responsible for holding a valid DataForSEO account, for complying with DataForSEO's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official DataForSEO product. Zapier is not responsible for changes DataForSEO makes to its API or for any consequence of your use of DataForSEO's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
