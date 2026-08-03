# Algolia API gotchas

Durable, public behavior of the Algolia Search + Recommend REST APIs that an agent needs to call these tools correctly. Sourced from Algolia's public documentation and public client-library issue trackers.

## Auth & API-key ACLs

- Every request carries two headers — `x-algolia-application-id` (your Application ID) and `x-algolia-api-key`. Keys are **long-lived** (they don't expire unless created with a `validity`), so there's no refresh/rotation flow; a rotated or revoked key just starts returning `403`.
- **API keys are ACL-scoped.** A **search-only** key can drive the read tools but returns `403 Method not allowed with this API key` on any write. Writes need a key with the matching ACL: `addObject` (index records), `deleteObject` (delete records / `deleteBy` / clear), `editSettings` (settings, synonyms, rules), `deleteIndex` (delete/copy/move index), `settings`/`browse`/`listIndexes` for the corresponding reads, `recommendation` for Recommend. A key restricted to specific indices returns `403 Index not allowed with this API key` on others.
- The Application ID is also part of the **host** (`{appId}.algolia.net`) — a wrong App ID surfaces as `403 Invalid Application-ID or API key`.

## Indexing is asynchronous (the #1 gotcha)

- Every write (`saveObject`, `addOrUpdateObject`, `partialUpdateObject`, `deleteObject`, `batch`, `multipleBatch`, `setSettings`, synonym/rule writes, `deleteBy`, `clearObjects`, copy/move) returns immediately with a numeric **`taskID`** — the API has _accepted_ the job, not applied it. The record is **not searchable until the task is published.**
- Use **`getTask`** and poll until `status: "published"` before asserting a write landed (e.g. before a "create then find" flow). `multipleBatch` returns a **map** of `indexName → taskID`; poll each.
- Even after publish, reads from the geo-routed DSN host can lag briefly — a search immediately after a write may not see it yet.

## objectID is always a string

- Algolia returns every `objectID` as a **string**, even when it looks numeric. Large numeric-looking IDs lose precision if round-tripped through a JS number — always treat `objectID` as an opaque string.
- `saveObject` (POST, no ID in path) **auto-generates** an `objectID` if the record omits one — convenient, but you then can't update or dedupe that record by a known ID later. To control it, include `objectID` in the record or use `addOrUpdateObject` (PUT at a specific ID).
- Two records written to the **same `objectID`** silently overwrite each other (no error) — the classic "records disappeared" footgun. `objectID` must not contain sensitive data; it's always returned in results.

## Records & the write tools

- Records are **schemaless** — arbitrary JSON plus the string `objectID`. There is no fixed record schema.
- `saveObject` = add (auto-ID); `addOrUpdateObject` (PUT) = **full replace** at an ID (attributes not sent are dropped); `partialUpdateObject` = merge specific attributes.
- **`partialUpdateObject` does NOT deep-merge nested objects.** Sending a nested attribute _replaces its first-level ancestor_ — sending `{ meta: { a: 1 } }` when the record has `meta: { a: 0, b: 9 }` **destroys `b`**. To preserve siblings, send the whole record via `addOrUpdateObject`.
- `partialUpdateObject`'s `createIfNotExists` defaults to **true** (creates the record if the ID is missing). With `createIfNotExists: false`, a patch to a missing ID is a **silent no-op** (success-shaped response, no write).
- **Batch sizing:** keep each `batch`/`multipleBatch` under **~10 MB** and roughly **1,000–10,000 records**. Per-record size is capped (**10 KB** on lower plans, up to **100 KB** higher); one oversized record rejects the **whole batch** with `400 Record ... is too big`.

## Destructive operations

- **`deleteBy` requires a filter.** An empty filter historically deleted the entire index; this connector refuses a `deleteBy` with no `filters`/`facetFilters`/`numericFilters`. It's also resource-intensive — Algolia recommends collecting objectIDs (via search/browse) and using record deletes for large sets. To intentionally empty an index, use **`clearObjects`** (keeps settings/synonyms/rules) or **`deleteIndex`** (removes everything).
- **`copyOrMoveIndex` overwrites the destination.** `move` is the atomic-reindex pattern (build a temp index, then move it onto the live name); `copy` with `scope` replaces only the listed scopes. Moving/copying from a source that doesn't exist can hang the task — confirm the source exists first.

## Filtering & faceting

- Three filter inputs with different syntax:
  - **`filters`** — a SQL-like string: `category:Book AND price > 10 AND NOT genre:horror`. Quote values with spaces (`author:"John Doe"`); escape a leading `-` (`category:\-Movie`) and negative numbers.
  - **`facetFilters`** — array syntax: a **flat** array is AND, a **nested** array is OR — `[["color:red","color:blue"], "size:M"]` = (red OR blue) AND size:M.
  - **`numericFilters`** — numeric/range comparisons, e.g. `["price>=10", "price<=100"]`.
- **An attribute must be in the index's `attributesForFaceting` before you can filter or facet on it** — otherwise the filter silently matches nothing (the top "my filter does nothing" cause). Discover the configured facets via `getSettings`; `searchForFacetValues` additionally needs the attribute declared `searchable(...)`.

## Pagination & the 1,000-hit cap

- `searchIndex` is page-based (`page` / `hitsPerPage`, max `hitsPerPage` **1,000**) and **cannot reach results past `paginationLimitedTo`** (default **1,000** total hits, raisable to 20,000). Sorting beyond the cap isn't guaranteed.
- For a full export / "get everything", use **`browseObjects`** (cursor-based) — it ignores the pagination cap and is the only way to read past 1,000 records. It is not relevance-ranked.

## Replicas & `forwardToReplicas`

- On `setSettings` and synonym/rule writes, **`forwardToReplicas` defaults to `false`** — the change applies only to the target index. Set it `true` to propagate, but the **replicas must already exist** first, and some settings (`searchableAttributes`, `attributesForFaceting`) are not forwarded.

## Recommend

- `getRecommendations` models: `related-products`, `bought-together`, `looking-similar` require an **`objectID`**; `trending-facets` requires a **`facetName`**; `trending-items` needs neither. `threshold` (0–100) is required by the API (this connector defaults it to 0).
- Collaborative/trends models need event/training data — an **untrained model returns few or no recommendations with no error**. Treat empty results as "not enough signal yet", not a failure.

## Error shape & hosts

- Errors are standard HTTP status codes with a JSON body `{ "message": "...", "status": <code> }`. This connector maps them: `403` → key lacks the ACL / wrong-or-revoked key; `404` → index or object not found; `400` → bad request (oversized record, malformed filter); `429` → rate-limited (back off); `5xx` → transient, retry.
- **Rate limits** return `429` (indexing-operation ceilings per plan unit; per-key `maxQueriesPerIPPerHour` if configured). Back off and reduce request volume; batch writes rather than sending many singles.
- Hosts: writes go to `{appId}.algolia.net`, reads to `{appId}-dsn.algolia.net`; the official clients also fail over across `{appId}-1/-2/-3.algolianet.com` (this connector uses the primary + DSN split; multi-host failover is not implemented).
