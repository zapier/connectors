# Use as a recipe — reimplementing DataForSEO calls

For a harness that **writes its own code** against the DataForSEO API and can't
load these tools, run the CLI, or import the package in-process (e.g. a
product-integrated sandbox with its own authed HTTP path). If the tools are
already callable, see [use-as-mcp.md](use-as-mcp.md); if you have a terminal, see
[use-as-cli.md](use-as-cli.md); to import the package, see
[use-as-sdk.md](use-as-sdk.md).

This file distills the request/response _shape_ of the scripts so you can write
equivalent code. It does **not** reproduce the connector's transport glue — use
your own authed request path (assumed below as `authedFetch`).

## The one call pattern (every tool)

Most DataForSEO v3 endpoints are a POST whose body is a **single-element array**
of one flat task object. (Two discovery endpoints are GET-only — see the note
below the table.) The response is an envelope; the real rows are usually nested
one level deeper than `tasks[0].result` — see the unwrap below.

```
POST https://api.dataforseo.com/v3/<endpoint>
Content-Type: application/json

Body:  [ { ...taskParams } ]          // note the array wrapper — always (POST)
```

```js
async function dataforseoLive(authedFetch, path, params, opts = {}) {
  const res =
    opts.method === "GET"
      ? await authedFetch(`https://api.dataforseo.com${path}`, {
          method: "GET",
        })
      : await authedFetch(`https://api.dataforseo.com${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([params]), // wrap the single task in an array
        });
  const body = await res.json();

  // Success/failure is IN-BODY over HTTP 200 — check BOTH levels.
  // See dataforseo-api-gotchas.md § "Errors arrive over HTTP 200".
  if (body.status_code !== 20000) throw new Error(body.status_message);
  const task = body.tasks?.[0];
  if (!task || task.status_code !== 20000) {
    throw new Error(task?.status_message ?? "task returned no data");
  }

  // Most endpoints wrap the rows one level deep: result[0] is a container whose
  // own `items[]` holds the data rows. A few (summary / discovery / account) put
  // the row fields directly on result[]. Detect the wrapper by an array `items`.
  const result = task.result ?? [];
  const first = result[0];
  const isWrapper = Array.isArray(first?.items);
  const items = isWrapper ? result.flatMap((r) => r.items ?? []) : result;
  return {
    items,
    items_count: isWrapper
      ? (first.items_count ?? items.length)
      : (task.result_count ?? items.length),
    cost: body.cost ?? 0,
  };
}
```

Within a row, several endpoints nest metrics under sub-objects
(`keyword_info.search_volume`, `metrics.organic.count`, an LLM answer under
`items[type=message].sections[].text`); flatten those to whatever flat shape you
want. The pre-made scripts' `outputSchema` is the source of truth for each tool's
final field set.

Auth is HTTP Basic (`Authorization: Basic <login:password>`) — your `authedFetch`
supplies it. See dataforseo-api-gotchas.md § "Authentication is HTTP Basic".

## Endpoints by task

Each tool maps to one endpoint path; pass the flat params shown, then read
`items` from the unwrapped result.

| Task                                            | Endpoint path                                                                                               | Key params                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Google organic SERP                             | `/v3/serp/google/organic/live/advanced`                                                                     | `keyword`, `location_name`, `language_name`, `device`, `se_domain`, `depth`, `target`                            |
| On-page audit                                   | `/v3/on_page/instant_pages`                                                                                 | `url`, `enable_javascript`, `enable_browser_rendering`, `custom_user_agent`, `accept_language`, `load_resources` |
| Keyword overview                                | `/v3/dataforseo_labs/google/keyword_overview/live`                                                          | `keywords[]`, `location_name`, `language_name`                                                                   |
| Keyword difficulty                              | `/v3/dataforseo_labs/google/bulk_keyword_difficulty/live`                                                   | `keywords[]`, `location_name`, `language_name`                                                                   |
| Keyword suggestions                             | `/v3/dataforseo_labs/google/keyword_suggestions/live`                                                       | `keyword`, `location_name`, `language_name`, `filters`, `order_by`, `limit`, `offset`                            |
| Related keywords                                | `/v3/dataforseo_labs/google/related_keywords/live`                                                          | `keyword`, `depth`, `filters`, `limit`                                                                           |
| Search intent                                   | `/v3/dataforseo_labs/google/search_intent/live`                                                             | `keywords[]`, `language_name`                                                                                    |
| Ranked keywords                                 | `/v3/dataforseo_labs/google/ranked_keywords/live`                                                           | `target`, `location_name`, `language_name`, `filters`, `limit`                                                   |
| Domain rank overview                            | `/v3/dataforseo_labs/google/domain_rank_overview/live`                                                      | `target`, `location_name`, `language_name`                                                                       |
| Organic traffic est.                            | `/v3/dataforseo_labs/google/bulk_traffic_estimation/live`                                                   | `targets[]`, `location_name`, `language_name`                                                                    |
| Historical traffic                              | `/v3/dataforseo_labs/google/historical_bulk_traffic_estimation/live`                                        | `targets[]`, `location_name`, `language_name`                                                                    |
| Google Ads volume                               | `/v3/keywords_data/google_ads/search_volume/live`                                                           | `keywords[]`, `location_name`, `language_name`                                                                   |
| Backlinks summary                               | `/v3/backlinks/summary/live`                                                                                | `target`, `include_subdomains`                                                                                   |
| Backlinks list                                  | `/v3/backlinks/backlinks/live`                                                                              | `target`, `mode`, `backlinks_status_type`, `filters`, `limit`                                                    |
| Backlink anchors                                | `/v3/backlinks/anchors/live`                                                                                | `target`, `backlinks_status_type`, `filters`, `limit`                                                            |
| Referring domains                               | `/v3/backlinks/referring_domains/live`                                                                      | `target`, `backlinks_status_type`, `filters`, `limit`                                                            |
| Bulk pages summary                              | `/v3/backlinks/bulk_pages_summary/live`                                                                     | `targets[]`                                                                                                      |
| Business listings                               | `/v3/business_data/business_listings/search/live`                                                           | `categories`, `title`, `location_coordinate`, `filters`, `limit`                                                 |
| Category aggregation                            | `/v3/business_data/business_listings/categories_aggregation/live`                                           | `categories`, `filters`, `limit`                                                                                 |
| LLM response (ChatGPT/Claude/Gemini/Perplexity) | `/v3/ai_optimization/<model>/llm_responses/live`                                                            | `user_prompt`, `model_name`, `max_output_tokens`, `temperature`, `top_p`, `system_message`, `message_chain`      |
| ChatGPT search (parsed)                         | `/v3/ai_optimization/chat_gpt/llm_scraper/live/advanced`                                                    | `keyword`, `location_name`, `language_name`, `force_web_search`                                                  |
| ChatGPT search (HTML)                           | `/v3/ai_optimization/chat_gpt/llm_scraper/live/html`                                                        | `keyword`, `location_name`, `language_name`, `force_web_search`, `expand_citations`                              |
| AI keyword volume                               | `/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live`                                           | `keywords[]`, `location_name`, `language_name`                                                                   |
| LLM mentions                                    | `/v3/ai_optimization/llm_mentions/search/live`                                                              | `target[]`, `platform`, `location_name`, `language_name`, `filters`, `limit`                                     |
| LLM mentions metrics                            | `/v3/ai_optimization/llm_mentions/{aggregated_metrics,cross_aggregated_metrics,top_domains,top_pages}/live` | `target[]` (or `targets[]` for cross), `platform`                                                                |
| Account balance                                 | `/v3/appendix/user_data`                                                                                    | — (GET)                                                                                                          |
| Locations & languages                           | `/v3/dataforseo_labs/locations_and_languages`                                                               | — (GET)                                                                                                          |

**GET-only endpoints.** `account balance` and `locations & languages` are
**GET**, with **no** array-wrapped body — call them with `{ method: "GET" }` and
no params. The response envelope is identical, so the same unwrap applies. (Every
other endpoint in the table is POST array-wrapped.)

## Response shape

Read the unwrapped result rows from `items`. Structural shape (field names only —
never assume specific returned values):

```
{ items: [ { /* endpoint-specific rows: keyword, url, rank, search_volume, ... */ } ],
  items_count: number,
  cost: number }
```

The per-endpoint output fields are defined by each script's `outputSchema` (the
source of truth); the rows above are illustrative.

## Critical rules (see the gotchas — don't restate)

- **In-body errors over HTTP 200** — check `status_code` at both the envelope and
  the task level; `20000` means ok. dataforseo-api-gotchas.md
  § "Errors arrive over HTTP 200".
- **Array-wrapped request body** — every call. § "Requests are an array of tasks".
- **Exact location/language names** — resolve via
  `/v3/dataforseo_labs/locations_and_languages`. § "Locations and languages must
  be exact full names".
- **`filters` array-expression syntax** and the 8-filter cap.
  § "The `filters` parameter".
- **`limit` max 1000**, page with `offset`. § "`limit` — vendor maximum is 1000".
- **Every call is billed** — read `cost`; check balance first for big batches.
  § "Cost — every call is billed".
- **Rate limits** — 2,000 req/min; 30 simultaneous per API group. § "Rate limits".
