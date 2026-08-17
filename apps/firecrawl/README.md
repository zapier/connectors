# @zapier/firecrawl-connector

<!-- BEGIN:readme-intro -->

Agent-callable tools for [Firecrawl](https://docs.firecrawl.dev), the web-data API. Scrape any URL into clean, LLM-ready Markdown; crawl a whole site; search the web; map a site's URLs; extract structured data; and search academic-paper and developer indexes — all through one connector over the Firecrawl v2 API. Authenticates with a single Firecrawl API key (`fc-…`), passed as a Zapier-managed connection or a direct token.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Firecrawl. Not affiliated with, endorsed by, or sponsored by Firecrawl. "Firecrawl" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:readme-intro -->

## When to use this

<!-- BEGIN:readme-when-to-use -->

Use this connector to turn the web into clean data for an agent: read a known page (`scrape`), crawl a site (`crawl`), search the web (`search`), enumerate a site's URLs (`map`), or extract structured data (`scrape` JSON mode / `startAgent`). It also drives a live browser for interactive pages and searches Firecrawl's research-paper and developer indexes. Best when you have (or can find) URLs and want their content back as Markdown, HTML, links, or structured JSON.
<!-- END:readme-when-to-use -->

## When NOT to use this

<!-- BEGIN:readme-when-not-to-use -->

- **Parsing local/uploaded documents.** It scrapes URLs, not files off your machine — give a public URL instead.
- **Scheduled monitoring or triggers.** There's no "watch this page" or event surface; it's request/response only.
- **Acting on third-party accounts.** It reads and extracts web data; it isn't a Slack/CRM/etc. connector for writing into an app.

<!-- END:readme-when-not-to-use -->

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/firecrawl-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/firecrawl-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill firecrawl
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "firecrawl": {
      "command": "npx",
      "args": ["@zapier/firecrawl-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

### Cloning the source

You don't need to clone anything to use this connector — the options above already cover that. Want the actual repo source instead, to read the script code, browse `references/`, run this connector's tests, or hack on it? Clone with a path filter so you only fetch this one connector, not the whole catalog:

```bash
git clone --filter=blob:none --sparse https://github.com/zapier/connectors.git
cd connectors && git sparse-checkout set apps/firecrawl
cd apps/firecrawl && npm install
```

See the [main README](https://github.com/zapier/connectors#cloning-the-source) to clone several connectors at once.

## Scripts

<!-- BEGIN:readme-scripts-table -->

| Script                 | Description                                                                    |
| ---------------------- | ------------------------------------------------------------------------------ |
| `scrape`               | Scrape one URL to Markdown/HTML/links/screenshot, or extract structured JSON.  |
| `batchScrape`          | Start an async job scraping a fixed list of URLs.                              |
| `getBatchScrapeStatus` | Poll a batch-scrape job's progress and scraped pages.                          |
| `cancelBatchScrape`    | Cancel a running batch-scrape job.                                             |
| `getBatchScrapeErrors` | List a batch-scrape job's per-URL errors.                                      |
| `crawl`                | Start an async crawl that follows links across a site.                         |
| `getCrawlStatus`       | Poll a crawl job's progress and scraped pages.                                 |
| `cancelCrawl`          | Cancel a running crawl job.                                                    |
| `getCrawlErrors`       | List a crawl job's per-URL and robots-blocked errors.                          |
| `getActiveCrawls`      | List the team's currently-running crawl jobs.                                  |
| `previewCrawlParams`   | Preview the crawl parameters a prompt would produce, without spending credits. |
| `map`                  | Discover a site's URLs fast, optionally ranked by relevance.                   |
| `search`               | Search the web (web/news/images), optionally scraping each result.             |
| `searchPapers`         | Search the academic-paper index (arXiv, PubMed, bioRxiv, medRxiv).             |
| `readPaper`            | Get a paper's metadata, or its most relevant full-text passages.               |
| `findRelatedPapers`    | Find papers related to a seed paper (similar / citing / cited).                |
| `searchDeveloper`      | Search the developer index (GitHub issues, PRs, READMEs, docs).                |
| `startAgent`           | Start an async agent that autonomously extracts structured data from a prompt. |
| `getAgentStatus`       | Poll an agent job's status and extracted data.                                 |
| `cancelAgent`          | Cancel a running agent job.                                                    |
| `createBrowserSession` | Create a live browser session you drive with code.                             |
| `executeBrowserCode`   | Run code in a live browser session and get its output.                         |
| `listBrowserSessions`  | List your browser sessions.                                                    |
| `deleteBrowserSession` | Close a browser session and stop its per-minute billing.                       |
| `interactWithScrape`   | Drive the browser session from a scrape with code or an AI prompt.             |
| `stopScrapeInteract`   | Stop the browser session tied to a scrape.                                     |
| `getCreditUsage`       | Get remaining credits (also the connection test).                              |
| `getTokenUsage`        | Get remaining extraction tokens.                                               |
| `getActivity`          | List the team's API jobs from the last 24h (recover a job id).                 |

<!-- END:readme-scripts-table -->

Run `npx @zapier/firecrawl-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

<!-- BEGIN:readme-usage-example -->

```ts
import { scrape } from "@zapier/firecrawl-connector";

const { data } = await scrape(
  { url: "https://example.com", formats: ["markdown"] },
  { connection: "env:FIRECRAWL_API_KEY" },
);
console.log(data.markdown); // clean, LLM-ready Markdown
```

<!-- END:readme-usage-example -->

## Auth

Already have a connection value? Pass it as shown above — `--connection` for the CLI/MCP shapes, `{ connection }` for imported functions. No connection yet? Pick one:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Source](https://github.com/zapier/connectors/tree/main/apps/firecrawl)

<!-- BEGIN:readme-links-extra -->

- [Firecrawl API docs](https://docs.firecrawl.dev/api-reference/v2-introduction)

<!-- END:readme-links-extra -->

<!-- BEGIN:readme-footer? -->
<!-- legal:footer -->

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Firecrawl's API, services, data, schemas, documentation, or other materials, which remain the property of Firecrawl. Your use of Firecrawl's API is governed by your own agreement with Firecrawl.

**Trademarks and affiliation.** Firecrawl and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Firecrawl.

**Your responsibility.** This connector calls Firecrawl's API using credentials you supply. You are responsible for holding a valid Firecrawl account, for complying with Firecrawl's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Firecrawl product. Zapier is not responsible for changes Firecrawl makes to its API or for any consequence of your use of Firecrawl's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
<!-- /legal:footer -->
<!-- END:readme-footer -->
