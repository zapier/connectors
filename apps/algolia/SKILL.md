---
name: algolia
description: Agent-callable Algolia tools — index records, search and browse them, manage index settings, synonyms, and query rules, and read AI recommendations.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/algolia/SKILL.md
  title: Algolia
  api-docs: https://www.algolia.com/doc/rest-api/search
  zapier-app-key: App238263CLIAPI
---

# Algolia

_Independent, unofficial connector for Algolia. Not affiliated with, endorsed by, or sponsored by Algolia. "Algolia" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for the Algolia Search and Recommend REST APIs. Index records into a search index, search and browse them, retrieve records by object ID, and manage the configuration that shapes relevance — index settings, synonyms, and query rules — plus read AI recommendations. Covers the full record lifecycle (write / read / search / delete, single and batch), index and index-config management, and the Recommend read surface.

## When to use this

- **Search and retrieve** — full-text search over an index (with filters and facets), federated multi-index search, cursor browse for export, get records by object ID, and facet-value search.
- **Index records** — add, replace, partial-update, and delete records, individually or in batches, across one or many indices.
- **Manage indices and relevance config** — list/delete/copy/move indices, read and update settings, and CRUD synonyms and query rules.
- **Recommendations** — read AI recommendations (related products, frequently-bought-together, trending, looking-similar) and the Recommend rules that curate them.

Writes are asynchronous — each returns a `taskID`; use `getTask` to confirm a write is applied before asserting it landed.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill algolia` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                  | Load                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__algolia__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                            | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                   | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Algolia API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

All scripts share the single `algolia` connection. Almost every tool takes an `indexName` — get it from `listIndices`. Object/synonym/rule IDs come from the corresponding search/browse tool.

| Script                             | Script name           | Connections | Description                                                             |
| ---------------------------------- | --------------------- | ----------- | ----------------------------------------------------------------------- |
| `scripts/searchIndex.ts`           | searchIndex           | algolia     | Search one index for records matching a query, with filters and facets. |
| `scripts/searchMultipleIndices.ts` | searchMultipleIndices | algolia     | Run several search queries in one request (federated / multi-index).    |
| `scripts/browseObjects.ts`         | browseObjects         | algolia     | Cursor-traverse every record in an index (export / reindex).            |
| `scripts/getObject.ts`             | getObject             | algolia     | Retrieve a single record by object ID.                                  |
| `scripts/getObjects.ts`            | getObjects            | algolia     | Retrieve multiple records by object ID, optionally across indices.      |
| `scripts/searchForFacetValues.ts`  | searchForFacetValues  | algolia     | Search the values of one faceted attribute.                             |
| `scripts/saveObject.ts`            | saveObject            | algolia     | Add a record; Algolia assigns an object ID if omitted.                  |
| `scripts/addOrUpdateObject.ts`     | addOrUpdateObject     | algolia     | Add or fully replace a record at a specific object ID (upsert).         |
| `scripts/partialUpdateObject.ts`   | partialUpdateObject   | algolia     | Update specific attributes on a record without replacing it.            |
| `scripts/deleteObject.ts`          | deleteObject          | algolia     | Delete a single record by object ID.                                    |
| `scripts/batch.ts`                 | batch                 | algolia     | Run many record operations against one index in one request.            |
| `scripts/multipleBatch.ts`         | multipleBatch         | algolia     | Run record operations across several indices in one request.            |
| `scripts/deleteBy.ts`              | deleteBy              | algolia     | Delete records in an index matching a filter (a filter is required).    |
| `scripts/clearObjects.ts`          | clearObjects          | algolia     | Delete all records in an index, keeping its config.                     |
| `scripts/listIndices.ts`           | listIndices           | algolia     | List the indices in the application.                                    |
| `scripts/deleteIndex.ts`           | deleteIndex           | algolia     | Permanently delete an index (records + config).                         |
| `scripts/copyOrMoveIndex.ts`       | copyOrMoveIndex       | algolia     | Copy or move (rename) an index; overwrites the destination.             |
| `scripts/getSettings.ts`           | getSettings           | algolia     | Read an index's settings (relevance, faceting, ranking).                |
| `scripts/setSettings.ts`           | setSettings           | algolia     | Update an index's settings (merged with existing).                      |
| `scripts/saveSynonym.ts`           | saveSynonym           | algolia     | Create or replace a single synonym.                                     |
| `scripts/getSynonym.ts`            | getSynonym            | algolia     | Fetch a single synonym by ID.                                           |
| `scripts/searchSynonyms.ts`        | searchSynonyms        | algolia     | Search or list synonyms in an index.                                    |
| `scripts/deleteSynonym.ts`         | deleteSynonym         | algolia     | Delete a single synonym by ID.                                          |
| `scripts/clearSynonyms.ts`         | clearSynonyms         | algolia     | Delete all synonyms in an index.                                        |
| `scripts/saveRule.ts`              | saveRule              | algolia     | Create or replace a single query rule.                                  |
| `scripts/getRule.ts`               | getRule               | algolia     | Fetch a single query rule by ID.                                        |
| `scripts/searchRules.ts`           | searchRules           | algolia     | Search or list query rules in an index.                                 |
| `scripts/deleteRule.ts`            | deleteRule            | algolia     | Delete a single query rule by ID.                                       |
| `scripts/getRecommendations.ts`    | getRecommendations    | algolia     | Read AI recommendations from a Recommend model.                         |
| `scripts/getRecommendRule.ts`      | getRecommendRule      | algolia     | Fetch a single Recommend rule by ID.                                    |
| `scripts/searchRecommendRules.ts`  | searchRecommendRules  | algolia     | Search or list Recommend rules for an index + model.                    |
| `scripts/getTask.ts`               | getTask               | algolia     | Check an async indexing task's status (poll until published).           |

## Disambiguation & refusals

- **Resolve names to IDs before writing.** Most write tools (`addOrUpdateObject`, `partialUpdateObject`, `deleteObject`, `saveSynonym`/`deleteSynonym`, `saveRule`/`deleteRule`) act on an `objectID` or an `indexName`, not a human name. Resolve first: use `listIndices` to pick the index, and `searchIndex` / `browseObjects` / `searchSynonyms` / `searchRules` to find the exact ID. If a search returns exactly one clear match, act on it; if two or more plausibly match, stop and ask which — list the candidates with a distinguishing field (e.g. a title attribute or the rule/synonym body). Never guess an ID or silently pick among ties.
- **Don't fabricate unsupported operations.** This connector does not manage API keys, edit language dictionaries, write Recommend rules (`getRecommendRule`/`searchRecommendRules` are read-only), or run Insights/Analytics/Personalization. If asked for one of these, say it's unsupported — don't substitute another tool and report success for something you didn't do.
- **Destructive tools are irreversible.** `deleteBy` (requires a filter — an empty filter is refused; use `clearObjects` to intentionally empty an index), `clearObjects`, `deleteIndex`, and `copyOrMoveIndex` (overwrites the destination) cannot be undone. Confirm the target index/filter before calling.

## Auth

Algolia uses two request headers (`x-algolia-application-id` and `x-algolia-api-key`) and carries the Application ID in the request host; the connector's resolver handles both. Two connection styles:

- **Direct key (`algolia:<PREFIX>`)** — recommended, works today. You supply the credentials via env vars (below).
- **Zapier-managed (`zapier:<connection-id>`)** — routes through Zapier so you don't hold the key. This requires the Algolia app to have hosted HTTP access enabled on Zapier's side; until that's provisioned, a `zapier:<id>` call returns a Zapier error (`does not support direct HTTP requests`). Use the direct key in the meantime.

Pass the connection as `--connection algolia:ALGOLIA`, where `ALGOLIA` is the prefix for two env vars the resolver reads:

- `ALGOLIA_APPLICATION_ID` — your Algolia Application ID.
- `ALGOLIA_API_KEY` — an API key whose ACLs cover the actions you call. A **search-only** key drives every read tool; the write tools need a key with write/admin ACLs (a search-only key returns a clear 403 on writes).

Find both in the Algolia dashboard under **API Keys**. Keys are long-lived; a rotated or revoked key surfaces as a 403 — replace it in your connection.

Auth is passed as a connection **selector**, not the secret — the `algolia:ALGOLIA` string names the env-var prefix, and the resolver reads the two `ALGOLIA_*` values at call time (the exact syntax per shape — CLI / MCP / SDK — is in the reference you loaded above). Checking what's already configured? Don't dump env values (`env`/`env | grep <name>` leak a live credential into the transcript); check names only (`env | cut -d= -f1 | grep -i algolia`) or test a name directly (`[ -n "$ALGOLIA_API_KEY" ]`).

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; see the reference you loaded above for how to inspect a script's exact schema in your shape).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, opt out of output validation (the exact syntax differs by shape — see the reference you loaded above). Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` (again, exact syntax per shape). The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` — or your shape's equivalent — to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

## References

Load the matching reference file before working in that area:

| Reference                                                                | Covers                                                                                                                                                                                                                                              | Load it when                                                                                                                       |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [`references/algolia-api-gotchas.md`](references/algolia-api-gotchas.md) | Auth/ACLs, async indexing (taskID → getTask), objectID-as-string, the record write model + partial-update nested-replace, filtering/faceting DSL, the 1,000-hit pagination cap, rate/size limits, destructive ops, replicas, Recommend, error shape | Before writing records, building filters/facets, configuring an index, or interpreting an error — i.e. almost any non-trivial call |
