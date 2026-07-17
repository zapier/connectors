---
name: dataforseo
description: Agent-callable DataForSEO tools — Google SERP results, keyword and domain analytics, backlinks, Google Maps business data, on-page audits, and AI-search visibility (LLM answers + brand mentions). Use when the user wants SEO or AI-search data, even if they don't name DataForSEO.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/dataforseo/SKILL.md
  title: DataForSEO
  api-docs: https://docs.dataforseo.com/v3/
  zapier-app-key: App207134CLIAPI
---

# DataForSEO

_Independent, unofficial connector for DataForSEO. Not affiliated with, endorsed by, or sponsored by DataForSEO. "DataForSEO" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for the [DataForSEO API v3](https://docs.dataforseo.com/v3/) (`https://api.dataforseo.com/v3/`): search-engine, SEO, and AI-search data. Look up Google organic SERPs; research keywords (suggestions, related terms, search volume, difficulty, intent); analyze domains (ranking keywords, rank overview, organic-traffic estimates); inspect backlink profiles; search Google Maps business listings; run an on-page SEO audit; query AI models (ChatGPT, Claude, Gemini, Perplexity) and track how brands and domains are mentioned in AI-generated answers. All 33 tools are **read-only** data queries against DataForSEO's live (synchronous) endpoints.

## When to use this

- **SERP & keyword research** — see who ranks for a query, expand a seed keyword, or pull volume / CPC / difficulty / intent for a keyword list.
- **Domain & competitor analysis** — the keywords a domain ranks for, its rank overview, estimated organic traffic (current or historical), and its backlink profile (summary, individual links, referring domains, anchors).
- **Local & on-page** — find Google Maps businesses by category or location, or audit a single page's on-page SEO.
- **AI-search visibility** — ask an LLM a prompt, or track where a brand / domain / keyword is mentioned across AI answers (top pages, top domains, aggregate metrics).

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__dataforseo__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill dataforseo` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`. On older Node, run `node cli.js --help` anyway: it detects your runtime and prints how to run without upgrading (the prebuilt npm package, or another runtime) — don't skip the connector just because Node is old.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

All scripts use the single connection `dataforseo`. Many take a `location_name` / `language_name` pair (full names, e.g. `"United States"` / `"English"`) — call `listLocationsAndLanguages` to resolve exact accepted values. List tools page with `limit` / `offset`.

| Script                                                                                       | Script name                        | Connections  | Description                                                                          |
| -------------------------------------------------------------------------------------------- | ---------------------------------- | ------------ | ------------------------------------------------------------------------------------ |
| [`scripts/getGoogleOrganicSerp.ts`](scripts/getGoogleOrganicSerp.ts)                         | `getGoogleOrganicSerp`             | `dataforseo` | Fetch live parsed Google organic results for a keyword.                              |
| [`scripts/getKeywordSuggestions.ts`](scripts/getKeywordSuggestions.ts)                       | `getKeywordSuggestions`            | `dataforseo` | Expand a seed keyword into long-tail queries that contain it.                        |
| [`scripts/getRelatedKeywords.ts`](scripts/getRelatedKeywords.ts)                             | `getRelatedKeywords`               | `dataforseo` | Get keywords from Google's "searches related to" block.                              |
| [`scripts/getKeywordOverview.ts`](scripts/getKeywordOverview.ts)                             | `getKeywordOverview`               | `dataforseo` | Full metrics (volume, CPC, competition, difficulty, intent) for known keywords.      |
| [`scripts/getKeywordDifficulty.ts`](scripts/getKeywordDifficulty.ts)                         | `getKeywordDifficulty`             | `dataforseo` | Keyword Difficulty (0–100) for up to 1,000 keywords.                                 |
| [`scripts/getSearchVolume.ts`](scripts/getSearchVolume.ts)                                   | `getSearchVolume`                  | `dataforseo` | Google Ads search volume, CPC, and competition for keywords.                         |
| [`scripts/getAiKeywordSearchVolume.ts`](scripts/getAiKeywordSearchVolume.ts)                 | `getAiKeywordSearchVolume`         | `dataforseo` | Estimated keyword usage volume inside AI tools.                                      |
| [`scripts/getSearchIntent.ts`](scripts/getSearchIntent.ts)                                   | `getSearchIntent`                  | `dataforseo` | Classify the search intent of up to 1,000 keywords.                                  |
| [`scripts/getRankedKeywords.ts`](scripts/getRankedKeywords.ts)                               | `getRankedKeywords`                | `dataforseo` | List the keywords a domain or URL ranks for in Google.                               |
| [`scripts/getDomainRankOverview.ts`](scripts/getDomainRankOverview.ts)                       | `getDomainRankOverview`            | `dataforseo` | A domain's organic + paid search overview.                                           |
| [`scripts/getOrganicTraffic.ts`](scripts/getOrganicTraffic.ts)                               | `getOrganicTraffic`                | `dataforseo` | Estimate current monthly organic traffic for up to 1,000 domains.                    |
| [`scripts/getHistoricalTraffic.ts`](scripts/getHistoricalTraffic.ts)                         | `getHistoricalTraffic`             | `dataforseo` | Estimate monthly organic traffic over the past ~12 months.                           |
| [`scripts/getBacklinksSummary.ts`](scripts/getBacklinksSummary.ts)                           | `getBacklinksSummary`              | `dataforseo` | Overview of a single target's backlink profile (totals, rank, spam score).           |
| [`scripts/getBacklinks.ts`](scripts/getBacklinks.ts)                                         | `getBacklinks`                     | `dataforseo` | List individual backlinks to a target with anchors and attributes.                   |
| [`scripts/getBacklinksBulkPagesSummary.ts`](scripts/getBacklinksBulkPagesSummary.ts)         | `getBacklinksBulkPagesSummary`     | `dataforseo` | Backlink counts for up to 1,000 pages/domains at once.                               |
| [`scripts/getReferringDomains.ts`](scripts/getReferringDomains.ts)                           | `getReferringDomains`              | `dataforseo` | Overview of the domains linking to a target.                                         |
| [`scripts/getBacklinkAnchors.ts`](scripts/getBacklinkAnchors.ts)                             | `getBacklinkAnchors`               | `dataforseo` | Anchor texts used in backlinks to a target.                                          |
| [`scripts/searchBusinessListings.ts`](scripts/searchBusinessListings.ts)                     | `searchBusinessListings`           | `dataforseo` | Search Google Maps business listings by category, name, or location.                 |
| [`scripts/getBusinessCategoriesAggregation.ts`](scripts/getBusinessCategoriesAggregation.ts) | `getBusinessCategoriesAggregation` | `dataforseo` | Count Google Maps businesses grouped by category.                                    |
| [`scripts/auditPage.ts`](scripts/auditPage.ts)                                               | `auditPage`                        | `dataforseo` | Run an instant on-page SEO audit of a single URL.                                    |
| [`scripts/getChatGptResponse.ts`](scripts/getChatGptResponse.ts)                             | `getChatGptResponse`               | `dataforseo` | Send a prompt to a ChatGPT model and get its response.                               |
| [`scripts/getChatGptSearchResults.ts`](scripts/getChatGptSearchResults.ts)                   | `getChatGptSearchResults`          | `dataforseo` | The web results ChatGPT cited for a keyword search, as structured items.             |
| [`scripts/getChatGptSearchResultsHtml.ts`](scripts/getChatGptSearchResultsHtml.ts)           | `getChatGptSearchResultsHtml`      | `dataforseo` | Raw HTML of ChatGPT's search results page for a keyword.                             |
| [`scripts/getClaudeResponse.ts`](scripts/getClaudeResponse.ts)                               | `getClaudeResponse`                | `dataforseo` | Send a prompt to a Claude model and get its response.                                |
| [`scripts/getGeminiResponse.ts`](scripts/getGeminiResponse.ts)                               | `getGeminiResponse`                | `dataforseo` | Send a prompt to a Gemini model and get its response.                                |
| [`scripts/getPerplexityResponse.ts`](scripts/getPerplexityResponse.ts)                       | `getPerplexityResponse`            | `dataforseo` | Send a prompt to a Perplexity model and get its response.                            |
| [`scripts/getLlmMentions.ts`](scripts/getLlmMentions.ts)                                     | `getLlmMentions`                   | `dataforseo` | Find where brands/domains/keywords are mentioned in AI answers.                      |
| [`scripts/getLlmMentionsTopPages.ts`](scripts/getLlmMentionsTopPages.ts)                     | `getLlmMentionsTopPages`           | `dataforseo` | Rank pages most cited alongside your targets in AI answers.                          |
| [`scripts/getLlmMentionsTopDomains.ts`](scripts/getLlmMentionsTopDomains.ts)                 | `getLlmMentionsTopDomains`         | `dataforseo` | Rank domains most cited alongside your targets in AI answers.                        |
| [`scripts/getLlmMentionsAggregatedMetrics.ts`](scripts/getLlmMentionsAggregatedMetrics.ts)   | `getLlmMentionsAggregatedMetrics`  | `dataforseo` | Aggregate AI-mention metrics (mention counts and AI search volume) for your targets. |
| [`scripts/getLlmMentionsCrossMetrics.ts`](scripts/getLlmMentionsCrossMetrics.ts)             | `getLlmMentionsCrossMetrics`       | `dataforseo` | AI-mention metrics grouped by custom keys for comparison.                            |
| [`scripts/getAccountBalance.ts`](scripts/getAccountBalance.ts)                               | `getAccountBalance`                | `dataforseo` | Account credit balance, plan limits, and rate (also the auth check).                 |
| [`scripts/listLocationsAndLanguages.ts`](scripts/listLocationsAndLanguages.ts)               | `listLocationsAndLanguages`        | `dataforseo` | List the exact location and language names DataForSEO accepts.                       |

## Disambiguation & refusals

This connector is **read-only and live-only** — it retrieves data, one query per call. It does not schedule or monitor tasks over time, run full-site crawls, or create/update/delete anything. If asked to do something outside that surface, say it's unsupported and stop — don't substitute another tool and report success for work you didn't do. Specifically:

- **No task scheduling or ongoing monitoring.** Each tool returns a one-shot live result; there is no "track rankings/backlinks over time" or background job. To trend a metric, the agent calls the tool again later and compares.
- **No full-site crawl.** `auditPage` audits a single URL only. There is no tool to crawl an entire site.
- **No writes.** Nothing here modifies a Google property, a website, or a DataForSEO resource; there is nothing to create, update, or delete.
- **ChatGPT-platform LLM mentions are US/English only.** `getLlmMentions` with `platform: "chat_gpt"` has no data outside the United States / English locale. If asked for another locale, say the data isn't available and stop — don't call `getChatGptResponse` (a live single-prompt chat, not mentions data) and present its output as mentions data, and don't silently swap to `platform: "google"` or a SERP search and report that instead without flagging the limitation.

Because every tool is a read that takes explicit query values (keywords, domains, URLs), there is no name-lookup-then-write step that needs disambiguation.

## Metric scales

- **Backlink rank** is 0–1000, **higher = stronger** — the opposite convention from a 0–100 difficulty-style score. Don't assume "lower is better" by analogy with keyword difficulty or search-position rank. Returned as `rank` by `getBacklinksSummary`, `getBacklinksBulkPagesSummary`, and `getReferringDomains`, and as `domain_from_rank` by `getBacklinks`.

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

DataForSEO uses **HTTP Basic authentication**: your account **login** (email) plus a dedicated **API password** (generated in your DataForSEO dashboard under API access — it is not your account/dashboard password). There are no scopes; a credential has your account's full API access, metered by credit balance (see `getAccountBalance`). The single connection `dataforseo` accepts two resolvers:

- **`zapier:<connection-id>`** — recommended. Route through a Zapier DataForSEO connection; the Zapier auth / retries / governance layer injects the credential for you. Find the id with `npx zapier-sdk list-connections` (run `login` first if needed).
- **`env:<PREFIX>`** — for standalone use when you manage the credential yourself. Set `DATAFORSEO_LOGIN` (your login email) and `DATAFORSEO_PASSWORD` (your API password), then pass `--connection env:DATAFORSEO`. The resolver reads `<PREFIX>_LOGIN` + `<PREFIX>_PASSWORD` and sends `Authorization: Basic base64(login:password)`.

A bad or revoked credential returns an authentication error — regenerate the API password in the dashboard and reconnect.

## Running scripts

After `npm install`, run a script by name with `node cli.js run <script>`, or execute its file directly — both take the same arguments and both accept `--help`. Always run a script's `--help` first to learn its exact input schema and connections, then invoke it:

```bash
# default — via the entry point; self-checks readiness and prints friendly diagnostics
node cli.js run <script> '<input-json>' --connection [<resolver>:]<value>
# shorthand — runs the script file directly (same args, same Node 22.18+ need, no readiness check)
./scripts/<script>.ts '<input-json>' --connection [<resolver>:]<value>
```

When a harness can't execute scripts directly, fall back to MCP — `node cli.js mcp` serves every script as a tool over stdio. Register it as a local MCP server in your client: the stanza is harness-specific (an `mcpServers` entry in Claude Desktop, Cursor, Claude Code, …) with `command: "node"`, `args: ["cli.js", "mcp"]`, run from this directory. Run `node cli.js mcp --help` for auth options. Add the stanza yourself if you can edit the client's MCP config; otherwise guide the user. If a local server isn't possible, guide the user to use Zapier's remote MCP servers at <https://mcp.zapier.com> instead.

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; run the script's `--help` to see that exact schema).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, append `--skipOutputDataValidation` to the script invocation. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, append `--filterOutputData '<jq>'` — a jq expression that post-processes `data`. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

## References

Load the matching reference file before working in that area:

| Reference                                                                    | Covers                                                                                                                                                                                                                                                                                                                                                           | Load it when                                                                                                                                                              |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [references/dataforseo-api-gotchas.md](references/dataforseo-api-gotchas.md) | In-body error status codes over HTTP 200, the array-of-tasks request format, the response envelope, auth, rate limits, exact location/language names, the `filters` array-expression syntax, `limit`/input caps, and metric-specific notes (backlink rank, keyword difficulty, related-keyword depth, SERP depth, LLM-mentions platform, Perplexity web search). | Any call fails with data-looking-empty results, you're building a `filters` expression, hitting a limit, resolving a location/language, or interpreting a metric's range. |
| [references/use-as-recipe.md](references/use-as-recipe.md)                   | A reference implementation of the request/response shape for each endpoint — the array-wrapped POST body, the two-level status check, and the per-tool endpoint/param table — with critical rules pointed at the gotchas.                                                                                                                                        | Loaded by a harness writing its own code against the DataForSEO API (can't load the tools, run the CLI, or import the package).                                           |
