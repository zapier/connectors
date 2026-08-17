---
name: firecrawl
description: Agent-callable Firecrawl tools — scrape a URL to clean Markdown, crawl a site, search the web, map site URLs, and extract structured data. Use when the user wants to read, scrape, crawl, or search web pages, even if they don't name Firecrawl.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/firecrawl/SKILL.md
  title: Firecrawl
  api-docs: https://docs.firecrawl.dev/api-reference/v2-introduction
  zapier-app-key: App204168CLIAPI
---

# Firecrawl

<!-- BEGIN:skill-intro -->

Agent-callable tools for [Firecrawl](https://docs.firecrawl.dev), the web-data API: turn any URL into clean, LLM-ready Markdown (`scrape`), read many URLs at once (`batchScrape`), crawl a whole site (`crawl`), discover a site's URLs (`map`), and search the web (`search`) — with optional page content. It also covers autonomous structured-data extraction (`startAgent`), a live driven browser (the interact tools), and Firecrawl's research-paper and developer indexes. Wraps the Firecrawl v2 API.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Firecrawl. Not affiliated with, endorsed by, or sponsored by Firecrawl. "Firecrawl" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:skill-intro -->

## When to use this

<!-- BEGIN:skill-use-cases -->

- **Read a page you have the URL for** — `scrape` returns clean Markdown (or HTML, links, a screenshot, or structured JSON). For many URLs use `batchScrape`; to follow links across a site use `crawl`.
- **Find pages you don't have the URL for** — `search` the web (optionally scraping each result), or `map` a site to enumerate its URLs.
- **Extract structured data** — `scrape` with the `json` format for a known URL, or `startAgent` for open-ended, no-URL extraction.
- **Search specialist indexes** — academic papers (`searchPapers` / `readPaper` / `findRelatedPapers`) and the developer index of GitHub issues/PRs/docs (`searchDeveloper`).

<!-- END:skill-use-cases -->

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill firecrawl` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                    | Load                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__firecrawl__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                              | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                     | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Firecrawl API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

<!-- BEGIN:skill-connections-note -->

All scripts use one connection, `firecrawl` (a Firecrawl API key). `crawl`, `batchScrape`, and `startAgent` are asynchronous — they return a job `id`; poll the matching `get*Status` script until it reports `completed`. `getCreditUsage` doubles as the connection test.
<!-- END:skill-connections-note -->

<!-- BEGIN:skill-scripts-table -->

| Script                 | Script name          | Connections | Description                                                                         |
| ---------------------- | -------------------- | ----------- | ----------------------------------------------------------------------------------- |
| `scrape`               | scrape               | firecrawl   | Scrape one URL to clean Markdown/HTML/links/screenshot, or extract structured JSON. |
| `batchScrape`          | batchScrape          | firecrawl   | Start an async job scraping a fixed list of URLs.                                   |
| `getBatchScrapeStatus` | getBatchScrapeStatus | firecrawl   | Poll a batch-scrape job's progress and scraped pages.                               |
| `cancelBatchScrape`    | cancelBatchScrape    | firecrawl   | Cancel a running batch-scrape job.                                                  |
| `getBatchScrapeErrors` | getBatchScrapeErrors | firecrawl   | List a batch-scrape job's per-URL errors.                                           |
| `crawl`                | crawl                | firecrawl   | Start an async crawl that follows links across a site and scrapes each page.        |
| `getCrawlStatus`       | getCrawlStatus       | firecrawl   | Poll a crawl job's progress and scraped pages.                                      |
| `cancelCrawl`          | cancelCrawl          | firecrawl   | Cancel a running crawl job.                                                         |
| `getCrawlErrors`       | getCrawlErrors       | firecrawl   | List a crawl job's per-URL and robots-blocked errors.                               |
| `getActiveCrawls`      | getActiveCrawls      | firecrawl   | List the team's currently-running crawl jobs.                                       |
| `previewCrawlParams`   | previewCrawlParams   | firecrawl   | Preview the crawl parameters a prompt would produce, without spending credits.      |
| `map`                  | map                  | firecrawl   | Discover a site's URLs fast, optionally ranked by relevance.                        |
| `search`               | search               | firecrawl   | Search the web (web/news/images), optionally scraping each result.                  |
| `searchPapers`         | searchPapers         | firecrawl   | Search the academic-paper index (arXiv, PubMed, bioRxiv, medRxiv).                  |
| `readPaper`            | readPaper            | firecrawl   | Get a paper's metadata, or its most relevant full-text passages.                    |
| `findRelatedPapers`    | findRelatedPapers    | firecrawl   | Find papers related to a seed paper (similar / citing / cited).                     |
| `searchDeveloper`      | searchDeveloper      | firecrawl   | Search the developer index (GitHub issues, PRs, READMEs, docs).                     |
| `startAgent`           | startAgent           | firecrawl   | Start an async agent that autonomously extracts structured data from a prompt.      |
| `getAgentStatus`       | getAgentStatus       | firecrawl   | Poll an agent job's status and extracted data.                                      |
| `cancelAgent`          | cancelAgent          | firecrawl   | Cancel a running agent job.                                                         |
| `createBrowserSession` | createBrowserSession | firecrawl   | Create a live browser session you drive with code.                                  |
| `executeBrowserCode`   | executeBrowserCode   | firecrawl   | Run code in a live browser session and get its output.                              |
| `listBrowserSessions`  | listBrowserSessions  | firecrawl   | List your browser sessions.                                                         |
| `deleteBrowserSession` | deleteBrowserSession | firecrawl   | Close a browser session and stop its per-minute billing.                            |
| `interactWithScrape`   | interactWithScrape   | firecrawl   | Drive the browser session from a scrape with code or an AI prompt.                  |
| `stopScrapeInteract`   | stopScrapeInteract   | firecrawl   | Stop the browser session tied to a scrape.                                          |
| `getCreditUsage`       | getCreditUsage       | firecrawl   | Get remaining credits (also the connection test).                                   |
| `getTokenUsage`        | getTokenUsage        | firecrawl   | Get remaining extraction tokens.                                                    |
| `getActivity`          | getActivity          | firecrawl   | List the team's API jobs from the last 24h (recover a job id).                      |

<!-- END:skill-scripts-table -->

<!-- BEGIN:disambiguation-and-refusals? -->

## Disambiguation & refusals

These jobs are **not supported** — don't substitute another tool and report success for something you didn't do:

- **Parsing a local or uploaded document** (PDF/DOCX/PPTX from the user's machine). This connector scrapes URLs; it has no file-upload tool. Ask for a public URL, or say document parsing isn't available here. (`scrape` reads a PDF at a URL, but cannot accept uploaded bytes.)
- **Scheduled / recurring monitoring** ("watch this page and alert me"). There is no monitor or trigger tool — this connector is request/response only. Say it's unsupported.
- **Anything that changes a website** (submit a form to persist data, post content). The interact tools can drive a browser within a session, but this connector is for reading/extracting web data, not acting on third-party accounts.

For the async tools (`crawl`, `batchScrape`, `startAgent`), act on the job `id` the start tool returns and poll the matching `get*Status`; never invent a job id. If you've lost one, recover it with `getActivity`.
<!-- END:disambiguation-and-refusals -->

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

<!-- BEGIN:skill-auth-notes? operational behavior that differs by WHICH resolver is used — a safety gate only one path enforces, scopes/permissions that differ between resolvers, a billing/plan difference tied to the auth path, or a feature only available (or unavailable) on one resolver. Not for describing how to obtain or pass a credential — that's references/use-without-zapier.md's job. Leave this region empty (unfilled) if every resolver behaves identically. -->
<!-- END:skill-auth-notes -->

No connection yet? Pick one — and follow the reference's own flow to obtain it; never just ask the user for a connection id or token as if they already have one memorized:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; see the reference you loaded above for how to inspect a script's exact schema in your shape).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, opt out of output validation (the exact syntax differs by shape — see the reference you loaded above). Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` (again, exact syntax per shape). The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` — or your shape's equivalent — to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

<!-- BEGIN:skill-references-table -->

## References

Load the matching reference file before working in that area:

| Reference                                                                    | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Load it when                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/firecrawl-api-gotchas.md`](references/firecrawl-api-gotchas.md) | Auth (`fc-` bearer key, plan/scope gating), the `{success:false,error}` error catalog with status→cause→remedy→retryable, `429` variants + `Retry-After`, credit/token billing and surcharges, the async crawl/batch/agent lifecycle (poll → `next` 10MB paging → 24h expiry), scrape formats + `maxAge` caching, search per-source `limit` + domain mutual-exclusion + research-index vs `categories:["research"]`, and per-minute browser-session billing | Before any call that can fail, spend credits, run async, or drive a browser session — i.e. handling errors/retries, reading `metadata.statusCode`, polling a job, tuning scrape/search options, or starting an interact/browser session |

<!-- END:skill-references-table -->
