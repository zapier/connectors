# Using Firecrawl without tools, terminal, or imports

This is the write-your-own-code path: no pre-registered tools, no terminal/subprocess access, and no way to `import` this package in-process (for example, a code-execution sandbox that only runs snippets you author). If any of those are actually available instead, use [`references/use-as-mcp.md`](use-as-mcp.md), [`references/use-as-cli.md`](use-as-cli.md), or [`references/use-as-sdk.md`](use-as-sdk.md) — this file is only for when none of them are.

<!-- BEGIN:use-as-recipe-content -->

## Calling the Firecrawl API directly

Firecrawl is a REST API. Every call is an authed HTTPS request to `https://api.firecrawl.dev/v2/<path>` with `Content-Type: application/json` on writes. Auth is a bearer key — send it however your harness sends auth (`your authed request to <endpoint>`); the shapes below omit it. For what the errors mean, when to retry, credit costs, and the async lifecycle, see [`firecrawl-api-gotchas.md`](firecrawl-api-gotchas.md) — don't re-derive those rules from here.

## Base pattern

- **Request:** `POST` (or `GET`) to `https://api.firecrawl.dev/v2/<path>`, JSON body for writes, JSON query params for reads.
- **Success:** the wire payload is `{ "success": true, "data": <result> }`. Most synchronous tools return `data`; the async job-submit calls return the top-level object (which carries the job `id`).
- **Error:** non-2xx returns `{ "success": false, "error": "<message>", "details"?: ... }`. Map status → cause → retry via the gotchas error table; the retryable set is `{408, 429, 500, 502, 503, 504}` and `429` carries `Retry-After`.

## Scrape one URL — `POST /scrape`

Request (shape; all but `url` optional):

```
{ url: string,
  formats?: ("markdown"|"summary"|"html"|"rawHtml"|"links"|"images"|"screenshot"|"json")[],
  onlyMainContent?: boolean, includeTags?: string[], excludeTags?: string[],
  waitFor?: number, timeout?: number, mobile?: boolean, maxAge?: number,
  proxy?: "basic"|"enhanced"|"auto", blockAds?: boolean,
  location?: { country?: string, languages?: string[] },
  jsonPrompt?: string, jsonSchema?: object,
  actions?: { type: "wait"|"click"|"write"|"press"|"scroll"|"screenshot"|"scrape"|"executeJavascript", ... }[] }
```

Response `data` (structural):

```
{ markdown?: string|null, summary?, html?, rawHtml?, links?: string[]|null,
  screenshot?: string|null, json?: object|null,
  metadata?: { title?, description?, sourceURL: string, url?, statusCode: number,
               contentType?, numPages?, error? } | null }
```

Critical: read `metadata.statusCode`, not just the HTTP status — a `200` can wrap a blocked page. `maxAge` caching defaults to 2 days; `formats` defaults to `["markdown"]`. See gotchas § Scrape specifics.

## Many URLs / whole sites — async jobs

- **`POST /batch/scrape`** — body `{ urls: string[], ignoreInvalidURLs?: boolean, scrapeOptions?: {...} }` → `{ id, invalidURLs? }`.
- **`POST /crawl`** — body `{ url, prompt?, includePaths?, excludePaths?, maxDiscoveryDepth?, limit?, sitemap?: "skip"|"include"|"only", crawlEntireDomain?, allowExternalLinks?, allowSubdomains?, ignoreQueryParameters?, delay?, scrapeOptions?: {...} }` → `{ id, url? }`.
- **`POST /agent`** — body `{ prompt, urls?, schema?, maxCredits?, model?: "spark-1-mini"|"spark-1-pro" }` → `{ id }`.

Then poll:

- **`GET /crawl/{id}`** / **`GET /batch/scrape/{id}`** → `{ status: "scraping"|"completed"|"failed"|"cancelled", total?, completed?, creditsUsed?, expiresAt?, next?: string|null, data?: <scraped-page>[] }`.
- **`GET /agent/{id}`** → `{ status, data?: object|null, creditsUsed?, expiresAt?, error? }`.

Loop until `status === "completed"`; if `next` is a URL, `GET` it for the next page of results (it chunks at 10MB); results expire 24h after completion. Errors per job: `GET /crawl/{id}/errors`, `GET /batch/scrape/{id}/errors` → `{ errors: [...], robotsBlocked: string[] }`. Cancel: `DELETE /crawl/{id}`, `DELETE /batch/scrape/{id}`, `DELETE /agent/{id}` (partial crawl/batch results stay retrievable). See gotchas § Async job lifecycle — including the crawl credit pre-check.

## Discover & search

- **`POST /map`** — body `{ url, search?, sitemap?, includeSubdomains?, ignoreQueryParameters?, limit? }` → `{ links: { url, title?, description? }[] }`. Enumerate URLs without scraping.
- **`POST /search`** — body `{ query, limit?, sources?: ("web"|"news"|"images")[], categories?: ("github"|"research"|"pdf")[], includeDomains?, excludeDomains?, tbs?, location?, country?, scrapeOptions?: {...} }` → `{ web?: [...], news?: [...], images?: [...] }` (one array per requested source). `limit` is per-source; `includeDomains`/`excludeDomains` are mutually exclusive (gotchas § Search & research).
- **`POST /search/developer`** — body `{ query, k?, types?: ("doc"|"issue"|"pull_request"|"readme")[], repos?, passages? }` → `{ results: { id?, type?, url, title?, passages? }[] }`.
- **Research index** (paper records, distinct from `categories:["research"]`): `GET /search/research/papers?query&k&authors&categories&from&to` → `{ results: { paperId, primaryId?, title, abstract?, score? }[] }`; `GET /search/research/papers/{id}?query&k` → `{ paper?, passages? }`; `GET /search/research/papers/{id}/similar?intent&mode&k` (`mode`: `similar`|`citers`|`references`) → `{ results: [...], poolSize?, truncated? }`.

## Interact / browser sessions

- Scrape-bound: `POST /scrape/{scrapeId}/interact` body `{ code? | prompt?, language?, timeout? }` (`code`/`prompt` mutually exclusive) → `{ output?, stdout?, result?, stderr?, exitCode?, error? }`; stop with `DELETE /scrape/{scrapeId}/interact` → `{ sessionDurationMs?, creditsBilled? }`. Get `scrapeId` from the scrape's `metadata.scrapeId`.
- Standalone: `POST /interact` body `{ ttl?, activityTtl? }` → `{ id, liveViewUrl?, interactiveLiveViewUrl?, expiresAt? }`; run code with `POST /interact/{id}/execute`; list with `GET /interact?status=`; close with `DELETE /interact/{id}`.
- These bill **per browser-minute** and keep billing until stopped — always issue the `DELETE`. See gotchas § Interact & browser sessions.

## Account

- **`GET /team/credit-usage`** → `{ remainingCredits, planCredits?, billingPeriod... }` (also a valid connection test); **`GET /team/token-usage`** → `{ remainingTokens, ... }`; **`GET /team/activity?endpoint&limit&cursor`** → `{ data: [...], cursor?, has_more? }`; **`GET /crawl/active`** → `{ crawls: [...] }`; **`POST /crawl/params-preview`** body `{ url, prompt }` → the crawl params Firecrawl would use (no credits spent).

<!-- END:use-as-recipe-content -->
