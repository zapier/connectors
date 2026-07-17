# DataForSEO API gotchas

Behavioral quirks of the DataForSEO API that aren't obvious from the tool
schemas. Every claim here is sourced from DataForSEO's public documentation.

## Errors arrive over HTTP 200 — check the in-body status code

DataForSEO carries success/failure **inside the response body**, not (only) in
the HTTP status. The docs state: _"Alongside the 200 HTTP code, our system also
generates internal status codes which you may find in status_code and
status_message fields of the API response."_
([status codes appendix](https://docs.dataforseo.com/v3/appendix-errors/))

The status code lives at **two levels** and both must be `20000` ("Ok.") for the
call to have actually succeeded:

- **Top-level** `status_code` — the whole request (e.g. auth or a malformed
  payload rejects the request outright).
- **Per-task** `tasks[].status_code` — this specific query. A task can fail
  (`status_code != 20000`, `result: null`) while the top-level status is still
  `20000` and the HTTP status is still `200`. This is the "success-shaped error":
  a 200 that carries no data. Treat any non-`20000` status at either level as an
  error, not as empty results.

Common status codes ([appendix](https://docs.dataforseo.com/v3/appendix-errors/)):

| Code    | Message                                       | Meaning                                    |
| ------- | --------------------------------------------- | ------------------------------------------ |
| `20000` | Ok.                                           | request completed successfully             |
| `20100` | Task Created.                                 | task accepted (queue endpoints)            |
| `40000` | You can set only one task at a time.          | more than one task in the POST array       |
| `40006` | You can set no more than 100 tasks at a time. | each POST request can hold up to 100 tasks |
| `40200` | Payment Required.                             | account balance must be recharged          |
| `40501` | Invalid Field.                                | one of the POST fields is invalid          |

## Requests are an array of tasks

Every v3 endpoint takes the POST body as an **array of task objects**, even for a
single query: _"When setting a task, you should send all task parameters in the
task array of the generic POST array."_
([SERP task docs](https://docs.dataforseo.com/v3/serp-se-type-live-advanced/))
These tools send a single-element array. You can batch up to 100 tasks per POST
request (error `40006` beyond that; error `40000` marks endpoints that accept only
one task at a time). **Exception:** the appendix/discovery endpoints
`/v3/appendix/user_data` and `/v3/dataforseo_labs/locations_and_languages` are
**GET** and take no request body — POSTing an array to them fails.

## The response envelope

A successful response is shaped like:

```json
{
  "version": "0.1.x",
  "status_code": 20000,
  "status_message": "Ok.",
  "cost": 0.0101,
  "tasks_count": 1,
  "tasks_error": 0,
  "tasks": [
    {
      "id": "...",
      "status_code": 20000,
      "status_message": "Ok.",
      "result_count": 1,
      "result": [ ... ]
    }
  ]
}
```

The top-level `cost` is the _"total tasks cost, USD"_ and per-task `result_count`
is the _"number of elements in the result array."_
([response example](https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_suggestions-live/))
These tools unwrap `tasks[0].result` into a flat `{ items, items_count, cost }`
surface.

## Cost — every call is billed

`cost` reports the USD charged for the request. SERP endpoints, for example, bill
_"per each SERP containing up to 10 results"_
([SERP live advanced](https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/)),
so a larger `depth` costs more. Use `getAccountBalance` to check credits before
running expensive batches.

## Authentication is HTTP Basic

_"Basic authentication is the only way to access DataForSEO API; credentials
should always be passed in the header of the request"_, in the form
`Authorization: Basic login:password`. Note the _"API password is generated
automatically by DataForSEO and is different from your account password."_
([auth docs](https://docs.dataforseo.com/v3/auth/))

## Rate limits

_"The general rate limit for DataForSEO API is 2,000 requests per minute."_ A
_"maximum number of simultaneous requests is limited to 30"_ applies to several
API groups (Labs, Backlinks, AI Optimization, OnPage, and others), and some
endpoints carry lower per-minute caps of their own — check the endpoint. For
task-post endpoints DataForSEO recommends _"up to 100 tasks per request."_
([rate limits](https://dataforseo.com/help-center/rate-limits-and-request-limits))

## Live endpoints — no polling

These tools use DataForSEO's **live** endpoints, which _"deliver results
instantly"_
([live endpoints](https://dataforseo.com/help-center/best-practices-live-endpoints-in-dataforseo-api))
— no separate task-post/task-get cycle. The OnPage instant-pages audit likewise
_"doesn't require making a separate GET request for obtaining task results."_
([instant_pages](https://docs.dataforseo.com/v3/on_page/instant_pages/))

## Locations and languages must be exact full names

Endpoints that take `location_name` / `language_name` want the **exact full name**
DataForSEO recognizes — e.g. `"United States"`, `"London,England,United Kingdom"`,
`"English"` — not an ISO code or an abbreviation. Each field is the _"full name of
the location"_ / _"full name of the language."_
([keyword_overview](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/))
Call `listLocationsAndLanguages` to resolve a place or language to the precise
string. For Google Ads search volume, _"if you do not indicate the location, you
will receive worldwide results"_
([search_volume](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/))
— there is no implicit country default at the API level.

## The `filters` parameter — array expressions

Many endpoints accept a `filters` array expression. A single condition has the
shape `[field, operator, value]`; the DataForSEO Labs docs describe it as
`[$item_array.$results_array.$parameter_field, $filter_operator, $filter_value]`
([Labs filters](https://docs.dataforseo.com/v3/dataforseo_labs-filters/)).
Combine several conditions with a logical `"and"` / `"or"` between them, and _"you
can add several filters at once (8 filters maximum)."_
([keyword_suggestions](https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_suggestions-live/))
Supported operators include
`regex, not_regex, <, <=, >, >=, =, <>, in, not_in, match, not_match, ilike,
not_ilike, like, not_like`. Example:
`["keyword_info.search_volume", ">", 100]`. Backlinks endpoints have their own
[filters page](https://docs.dataforseo.com/v3/backlinks/filters/) with the same
`[field, operator, value]` shape and nested and/or grouping, e.g.
`[["domain_from","=","dataforseo.com"],"and",["anchor","like","%seo%"]]`.

## `limit` — vendor maximum is 1000

The API caps `limit` at **1000** for the paginated Labs, backlinks, and
business-listings endpoints (_"default value: 100; maximum value: 1000"_)
([keyword_suggestions](https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_suggestions-live/)).
Use `offset` to page through larger result sets. (These tools apply their own
smaller default when you omit `limit`; pass an explicit value when you need a
specific count.)

## Per-endpoint input caps

Bulk endpoints cap how many items you can pass in one call:

- **Keyword Overview** — _"The maximum number of keywords you can specify: 700"_, and
  each keyword is capped at 80 characters / 10 words
  ([keyword_overview](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/)).
- **Bulk Keyword Difficulty**, **Search Intent** — _"maximum number of keywords you
  can specify in this array: 1000"_
  ([bulk_keyword_difficulty](https://docs.dataforseo.com/v3/dataforseo_labs/google/bulk_keyword_difficulty/live/),
  [search_intent](https://docs.dataforseo.com/v3/dataforseo_labs/google/search_intent/live/)).
- **Bulk / Historical Traffic Estimation** — up to _"1,000 domains, subdomains, or
  webpages"_
  ([bulk_traffic_estimation](https://docs.dataforseo.com/v3/dataforseo_labs/google/bulk_traffic_estimation/live/)).
- **Bulk Pages Summary** — _"up to 1000 pages, domains, or subdomains in each
  request"_, and _"cannot belong to more than 100 different domains"_
  ([bulk_pages_summary](https://docs.dataforseo.com/v3/backlinks/bulk_pages_summary/live/)).
- **LLM Mentions** targets — _"up to 10 entities (objects) in the target field"_;
  cross-metrics needs _"not less than 2"_ target sets
  ([aggregated_metrics](https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/aggregated_metrics/live/),
  [cross_aggregated_metrics](https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/cross_aggregated_metrics/live/)).

## Metric-specific notes

- **Backlink rank** ranges _"from 0 (no backlinks detected) to 1000 (large number
  of quality backlinks)"_
  ([what is rank](https://dataforseo.com/help-center/what_is_rank_in_backlinks_api)).
- **Keyword Difficulty** _"indicates the chance of getting in top-10 organic
  results for a keyword on a logarithmic scale from 0 to 100"_
  ([bulk_keyword_difficulty](https://docs.dataforseo.com/v3/dataforseo_labs/google/bulk_keyword_difficulty/live/)).
- **Backlink status** — the `backlinks_status_type` parameter takes `all`, `live`,
  or `lost` (_"live – backlinks found during the last check"_); the default is
  `live`
  ([backlinks](https://docs.dataforseo.com/v3/backlinks/backlinks/live/)).
- **Backlinks grouping** — `mode` is `as_is` (all backlinks), `one_per_domain`, or
  `one_per_anchor`; default `as_is`
  ([backlinks](https://docs.dataforseo.com/v3/backlinks/backlinks/live/)).
- **Related-keyword depth** — `depth` is a level from **0 to 4** (default 1); the
  keyword count grows per level, up to ~4680 at level 4 (level 4 is the _count_
  cap, not the depth value)
  ([related_keywords](https://docs.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live/)).
- **SERP `depth`** — number of results to parse, default 10, _"max value: 200"_;
  billed per 10 results
  ([serp organic](https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/)).
- **Browser rendering** — on the OnPage audit, `enable_browser_rendering`
  automatically enables `enable_javascript` and `load_resources`
  ([instant_pages](https://docs.dataforseo.com/v3/on_page/instant_pages/)).
- **AI keyword search volume** is _"calculated using statistical data from
  questions in the 'People Also Ask' SERP element"_ — it is a modeled proxy, not
  measured AI-tool usage
  ([ai_keyword_data](https://docs.dataforseo.com/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live/)).
- **LLM Mentions `platform`** accepts `chat_gpt` or `google` (default `google`);
  `chat_gpt` data is available for the United States / English only
  ([llm_mentions search](https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/search/live/)).
- **Perplexity responses** always run web search on Sonar-family models — there is
  no web-search toggle; _"Perplexity uses web_search in all sonar-family models by
  default, but it's not guaranteed to work with every request"_
  ([perplexity](https://docs.dataforseo.com/v3/ai_optimization/perplexity/llm_responses/live/)).
