# Using Algolia without tools, terminal, or imports

This is the write-your-own-code path: no pre-registered tools, no terminal/subprocess access, and no way to `import` this package in-process (for example, a code-execution sandbox that only runs snippets you author). If any of those are actually available instead, use [`references/use-as-mcp.md`](use-as-mcp.md), [`references/use-as-cli.md`](use-as-cli.md), or [`references/use-as-sdk.md`](use-as-sdk.md) — this file is only for when none of them are.

## Auth & base URL

Every request goes to `https://{applicationId}.algolia.net` for writes and `https://{applicationId}-dsn.algolia.net` for reads, and carries two headers: `x-algolia-application-id: {applicationId}` and `x-algolia-api-key: {apiKey}`. There is no `Authorization` header. Send/receive JSON.

## Request patterns

Endpoints (method + path + input shape). `{indexName}` and IDs are URL-path segments (URL-encode them).

- **Search** — `POST /1/indexes/{indexName}/query`, body `{ query?, filters?, facetFilters?, numericFilters?, page?, hitsPerPage?, attributesToRetrieve?, facets? }`.
- **Multi-index search** — `POST /1/indexes/*/queries`, body `{ requests: [{ indexName, query?, ... }], strategy? }`.
- **Browse (export)** — `POST /1/indexes/{indexName}/browse`, body `{ cursor?, filters?, hitsPerPage? }`; pass the returned `cursor` back until it's absent.
- **Get record(s)** — `GET /1/indexes/{indexName}/{objectID}`; or `POST /1/indexes/*/objects`, body `{ requests: [{ indexName, objectID, attributesToRetrieve? }] }`.
- **Facet-value search** — `POST /1/indexes/{indexName}/facets/{facetName}/query`, body `{ facetQuery?, maxFacetHits? }`.
- **Add / replace / patch record** — `POST /1/indexes/{indexName}` (body = the record; ID auto-generated); `PUT /1/indexes/{indexName}/{objectID}` (body = the full record); `POST /1/indexes/{indexName}/{objectID}/partial?createIfNotExists=` (body = the attributes to merge).
- **Delete / clear** — `DELETE /1/indexes/{indexName}/{objectID}`; `POST /1/indexes/{indexName}/deleteByQuery` (body = a non-empty filter set); `POST /1/indexes/{indexName}/clear`.
- **Batch** — `POST /1/indexes/{indexName}/batch` or `POST /1/indexes/*/batch`, body `{ requests: [{ action, body, indexName? }] }`.
- **Indices/settings** — `GET /1/indexes`; `DELETE /1/indexes/{indexName}`; `POST /1/indexes/{indexName}/operation` (copy/move); `GET|PUT /1/indexes/{indexName}/settings?forwardToReplicas=`.
- **Synonyms/rules** — `PUT|GET|DELETE /1/indexes/{indexName}/synonyms/{objectID}`, `POST .../synonyms/{search,clear,batch}`; same shape under `/rules`.
- **Recommend** — `POST /1/indexes/*/recommendations`, body `{ requests: [{ indexName, model, threshold, objectID? | facetName? }] }`.
- **Task status** — `GET /1/indexes/{indexName}/task/{taskID}`.

## Response shapes (structural)

- Search/browse: `{ hits: object[], nbHits: number, page: number, nbPages: number, hitsPerPage: number, facets?: object, queryID?: string, cursor?: string }`.
- Get record: the record object (arbitrary attributes + string `objectID`); `getObjects` → `{ results: (object|null)[] }`.
- Writes: `{ taskID: number, objectID?: string, objectIDs?: string[], createdAt?/updatedAt?/deletedAt?: string }` (`multipleBatch` → `taskID` is an `indexName→number` map).
- Task status: `{ status: "published" | "notPublished", pendingTask: boolean }`.

## Error handling & critical rules

Non-2xx returns `{ message, status }`. For what each status means and how to recover, and for the rules a from-scratch implementation must get right — **asynchronous writes (poll the task before asserting), `objectID` is always a string, `partialUpdateObject` replaces nested ancestors, `deleteBy` needs a filter, the 1,000-hit search cap, `attributesForFaceting` before filtering, `forwardToReplicas` defaults false** — see [`references/algolia-api-gotchas.md`](algolia-api-gotchas.md). Don't restate those here.
