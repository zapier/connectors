<!-- BEGIN:api-gotchas-content -->

## Firecrawl API gotchas

The behaviors below trip up first-time integrations. Each is sourced from Firecrawl's public docs. Base URL for every operation is `https://api.firecrawl.dev/v2`.

## Authentication

- **Bearer API key, `fc-`-prefixed.** Every authenticated request sends an `Authorization` header: `Bearer fc-...`. Per the API reference: "the header should contain `Bearer fc-123456789`, where `fc-123456789` represents your API Key." A missing/malformed/revoked key returns `401 Unauthorized: Invalid token`; get a key from the [dashboard](https://www.firecrawl.dev/app/api-keys). ([auth](https://docs.firecrawl.dev/api-reference/introduction), [errors](https://docs.firecrawl.dev/api-reference/errors))
- **Key scope / plan gating.** A key that lacks permission for an endpoint or feature returns `403 Forbidden` — "use a key with the required scope, or upgrade the plan that gates this feature." So a valid key can still be rejected per-feature. ([errors](https://docs.firecrawl.dev/api-reference/errors))
- **Keyless is limited.** Without a key, only Search, Scrape, and Parse are available (plus Interact for official clients, and research/developer search on Firecrawl Cloud); "no other endpoints (crawl, extract, map, batch scrape, etc.) are available without a key." Keyless is capped per IP per day by both a request cap and a credit cap. ([rate-limits](https://docs.firecrawl.dev/rate-limits))

## Error envelope

- **Uniform error shape.** "All non-2xx responses return JSON with a top-level `success: false` and a string `error`." Some endpoints add `details` (per-field validation) or `code`. Look up the `error` string (or HTTP status) in the catalog to find cause + remedy. ([errors](https://docs.firecrawl.dev/api-reference/errors))
- **A `200` scrape can still carry a page-level failure.** Check `metadata.statusCode` on a scraped document: the scrape wrapper can succeed while the target page returned `403`/`404`. "You can check the `metadata.statusCode` field in the API response to detect these cases and avoid retrying URLs that are consistently blocked." ([billing](https://docs.firecrawl.dev/billing))

### Status → cause → remedy → retryable

Firecrawl's own guidance: "Treat the **Retryable** column as authoritative; do not infer from the HTTP status alone." The retryable set is `{408, 429, 500, 502, 503, 504}`. ([errors](https://docs.firecrawl.dev/api-reference/errors))

| HTTP | Cause                                                                        | Remedy                                                              | Retryable    |
| ---- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------ |
| 400  | Body failed schema validation, or `url` missing/malformed/unsupported scheme | Fix the payload; pass an absolute `http(s)://` URL; check `details` | No           |
| 401  | API key missing/malformed/revoked                                            | Send a valid `Authorization: Bearer fc-...`                         | No           |
| 402  | Plan credits exhausted or billing not configured                             | Top up, enable Smart Upgrade, or upgrade the plan                   | No           |
| 403  | Key lacks permission / feature gated by plan                                 | Use a scoped key or upgrade                                         | No           |
| 404  | Job id, resource, or endpoint path does not exist                            | Verify the id and endpoint URL                                      | No           |
| 408  | Page took longer than the request `timeout` to load                          | Increase `timeout`, simplify actions                                | Yes, backoff |
| 409  | Resource state prevents the operation (e.g. already deleted)                 | Re-fetch state and reconcile                                        | No           |
| 413  | Request body exceeded the max allowed size                                   | Shorten schema / fewer URLs per batch                               | No           |
| 422  | Invalid JSON Schema, or model couldn't produce a conforming result           | Validate schema; loosen required fields; try a different `model`    | Sometimes    |
| 429  | Per-minute rate limit **or** concurrency limit reached                       | Back off; honor `Retry-After`; lower concurrency or upgrade         | Yes, backoff |
| 500  | Unhandled server-side failure                                                | Retry with exponential backoff                                      | Yes, backoff |
| 502  | Upstream proxy/worker returned an invalid response                           | Retry with backoff                                                  | Yes, backoff |
| 503  | Service temporarily unavailable                                              | Retry with backoff                                                  | Yes, backoff |
| 504  | Request exceeded the gateway timeout (typically long crawls)                 | Use the async crawl/batch endpoints and poll status                 | Yes, backoff |

### 429 has two distinct causes

`429` is returned both for `Rate limit exceeded` ("too many requests for your plan's per-minute limit") and for `Concurrency limit reached` ("concurrent browser limit for your plan reached"). "For 429 responses, Firecrawl includes a `Retry-After` header (in seconds) when available — wait at least that long before retrying." ([errors](https://docs.firecrawl.dev/api-reference/errors))

## Credits & billing

- **Credit-based, charged per processed request.** "Every API call you make consumes credits, and the number of credits consumed depends on the endpoint and options you use." Base costs: Scrape/Crawl 1 credit/page, Map 1 credit/call, Search 2 credits per 10 results (rounded up), Interact 2 credits/browser-minute, Agent dynamic ("5 daily runs free; usage-based pricing beyond that"). ([billing](https://docs.firecrawl.dev/billing))
- **Scrape-option surcharges stack.** PDF parsing +1 credit/PDF page, JSON (LLM extraction) +4/page, Enhanced Mode +4/page, ZDR +1/page — and they stack (e.g. JSON + Enhanced = 1+4+4 = 9/page). The same modifiers apply to Crawl and Search since those scrape internally. ([billing](https://docs.firecrawl.dev/billing))
- **Charged even when the target site errors.** "Credits are charged whenever Firecrawl's infrastructure processes a request, even if the target site returns an HTTP error status code such as 403 Forbidden or 404 Not Found." ([billing](https://docs.firecrawl.dev/billing))
- **Async jobs bill asynchronously.** "For batch scrape and crawl jobs, credits are billed asynchronously as each page completes processing — not when the job is submitted," so the full cost can appear minutes/hours later. ([billing](https://docs.firecrawl.dev/billing))
- **Running out.** With no Smart Upgrade, credit-consuming requests return `402 (Payment Required)` once the allotment is exhausted. ([billing](https://docs.firecrawl.dev/billing))
- **Two separate balances.** Credits (scraping/crawling) and extraction **tokens** (LLM-extraction features) are tracked independently — the connector surfaces them via `getCreditUsage` and `getTokenUsage`. `getCreditUsage` doubles as the connection test (a `200` confirms a valid key).
- **`x.com`/Twitter costs more.** Requests to `x.com`, `twitter.com`, `mobile.twitter.com` route through the Grok API with separate pricing: base 1 credit + "+29 credits / request" for the Grok X query. ([billing](https://docs.firecrawl.dev/billing))

## Rate & concurrency limits

- **Two independent ceilings, both per team.** Rate limits (requests/minute) and concurrency limits (parallel jobs) are both set by plan; "exceeding either returns a `429` response." "Rate limits are applied per team, so all API keys on the same team share the same rate limit counters." ([rate-limits](https://docs.firecrawl.dev/rate-limits))
- **Concurrency is usually the real bottleneck.** "When configured correctly, your real bottleneck will be concurrent browsers." Concurrent-browser ceilings scale by plan (Free 2 → Scale/Enterprise 150+). Jobs beyond the ceiling queue; "time spent in the queue counts against the request's `timeout`," and queued jobs "time out after a maximum of 48 hours." ([rate-limits](https://docs.firecrawl.dev/rate-limits))

## Async job lifecycle (crawl, batchScrape, agent)

- **Start → poll → terminal.** `crawl`, `batchScrape`, and `startAgent` return a job `id`; poll `getCrawlStatus` / `getBatchScrapeStatus` / `getAgentStatus` until `status` is `completed` (crawl/batch statuses: `scraping | completed | failed | cancelled`). ([crawl](https://docs.firecrawl.dev/features/crawl))
- **Crawl pre-checks credits for the whole `limit`.** "Before starting, the crawl endpoint checks that your remaining credits can cover the `limit` — if not, it returns a 402." Default crawl `limit` is 10,000 pages; set a lower one to avoid the pre-check failure. ([crawl](https://docs.firecrawl.dev/features/crawl))
- **`next` paginates at 10MB.** On status responses, `next` is "the URL to retrieve the next 10MB of data. Returned if the crawl is not completed or if the response is larger than 10MB." Absent `next` = end of data. (The `skip`/`next` params only matter when hitting the API directly; SDKs paginate for you.) ([crawl-get](https://docs.firecrawl.dev/api-reference/endpoint/crawl-get))
- **Results expire in 24h.** "Job results are available via the API for 24 hours after completion." After that, results live only in the dashboard activity logs. ([crawl](https://docs.firecrawl.dev/features/crawl))
- **Cancelling keeps partial results.** After `cancelCrawl` / `cancelBatchScrape`, pages already scraped stay retrievable via the matching status tool.
- **Finding a lost job id.** `getActivity` lists the team's jobs from the last 24h (each with id + endpoint + target); `getActiveCrawls` lists currently-running crawls.

## Scrape specifics

- **Formats & defaults.** `formats` defaults to `["markdown"]`. `onlyMainContent` defaults to `true` and is "a deterministic HTML-level filter applied before markdown is generated; no LLM is involved." `summary` = LLM summary; `json` = structured extraction (drive with `jsonPrompt`/`jsonSchema`). ([scrape](https://docs.firecrawl.dev/api-reference/endpoint/scrape))
- **`maxAge` caching.** "Returns a cached version of the page if it is younger than this age in milliseconds… Defaults to 2 days" (`172800000`). "If you do not need extremely fresh data, enabling this can speed up your scrapes by 500%." Pass `0` to force a fresh scrape. ([scrape](https://docs.firecrawl.dev/api-reference/endpoint/scrape))
- **Signed-URL expiry.** "Screenshots expire after 24 hours"; extracted `audio`/`video` signed URLs "expire after 1 hour." ([scrape](https://docs.firecrawl.dev/api-reference/endpoint/scrape))

## Search & research

- **Per-source `limit`.** `search`'s `limit` is max results **per source** (each requested `sources` entry — `web`/`news`/`images` — returns its own array). ([search](https://docs.firecrawl.dev/features/search))
- **`includeDomains` and `excludeDomains` are mutually exclusive.** "`includeDomains` and `excludeDomains` are mutually exclusive" — pass at most one. Domains are hostnames only (no protocol/path). ([search-endpoint](https://docs.firecrawl.dev/api-reference/endpoint/search))
- **`categories: ["research"]` ≠ the paper index.** On `search`, `research` "is a website filter, not the paper index" — it narrows _web_ results to a fixed list of academic domains and returns ordinary web snippets. To search paper records directly (abstracts + passages + citation-graph), use the Research Index tools (`searchPapers`, `readPaper`, `findRelatedPapers`) — "a paper index of ~43M abstracts — PubMed, bioRxiv, medRxiv, arXiv." ([research](https://docs.firecrawl.dev/features/research))
- **`searchDeveloper` is a distinct index.** It searches "GitHub issues, merged PRs, repo READMEs, and curated docs sites" — separate from both web search and the paper index.

## Interact & browser sessions (billed per minute — always stop them)

- **Two entry points.** `interactWithScrape`/`stopScrapeInteract` drive the browser bound to a prior scrape (get `jobId` from the scrape's `metadata.scrapeId`); `createBrowserSession` + `executeBrowserCode` + `deleteBrowserSession` are a standalone session with its own lifecycle. "Use scrape-bound Interact when the workflow begins with `POST /v2/scrape`… Use Browser Sandbox when you need a standalone session." ([interact](https://docs.firecrawl.dev/features/interact))
- **Billed per browser-minute — stop the session.** Interact bills "2 credits / browser minute" (billed per minute). A session keeps billing until stopped or it expires, so always call `stopScrapeInteract` / `deleteBrowserSession` when done. Session lifetime is bounded by `ttl` (30–3600s) and `activityTtl`. ([billing](https://docs.firecrawl.dev/billing))

<!-- END:api-gotchas-content -->
