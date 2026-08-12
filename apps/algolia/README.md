# @zapier/algolia-connector

<!-- BEGIN:readme-intro -->

Agent-callable tools for the [Algolia](https://www.algolia.com) Search and Recommend REST APIs ([API docs](https://www.algolia.com/doc/rest-api/search)). Index records into a search index, search and browse them, retrieve records by object ID, and manage the configuration that shapes relevance — index settings, synonyms, and query rules — plus read AI recommendations. Covers the full record lifecycle (write / read / search / delete, single and batch), index and config management, and the Recommend read surface. Authenticates with a direct Algolia API key (Application ID + API key).

<!-- legal:disclaimer -->

_Independent, unofficial connector for Algolia. Not affiliated with, endorsed by, or sponsored by Algolia. "Algolia" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:readme-intro -->

## When to use this

<!-- BEGIN:readme-when-to-use -->

Use it to drive an Algolia application programmatically: index and update records (single or batch), run searches with filters and facets, browse an index for export, and manage relevance config — settings, synonyms, and query rules. It's a good fit when an agent needs to read from or write to Algolia indices, or read AI recommendations, against the public REST API.
<!-- END:readme-when-to-use -->

## When NOT to use this

<!-- BEGIN:readme-when-not-to-use -->

- **Account/key administration** — it does not create or manage API keys, or configure multi-cluster (MCM) setups. Use the Algolia dashboard.
- **Other Algolia products** — Insights, Analytics, Personalization, Query Suggestions, Crawler, and Ingestion are separate APIs not covered here.
- **Writing Recommend rules or editing dictionaries** — Recommend rules are read-only in this connector, and language dictionaries are out of scope for v1.

<!-- END:readme-when-not-to-use -->

## Install

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

```bash
# Run a script with zero install — npx fetches the package on first use
export <ENV_VAR>=xxx
npx @zapier/algolia-connector@latest run <script> '<input-json>' --connection env:<ENV_VAR>

# Install as a dependency to import the functions in your own code
npm install @zapier/algolia-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills add zapier/connectors --skill algolia
```

Auth is one `[<resolver>:]<value>` connection string passed with `--connection` — a _selector_, not the secret. The `<resolver>:` prefix is optional; a bare value is claimed by the first matching resolver. See [Auth](#auth) below for the with/without-Zapier tradeoffs and how to find a connection ID.

### MCP server

Run the connector as an MCP server over stdio so any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) auto-discovers the scripts as tools — add one stanza to the client's config:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "algolia": {
      "command": "npx",
      "args": ["@zapier/algolia-connector", "mcp"]
    }
  }
}
```

`--connection` is optional — omit it to pass a connection per tool call, or add `"--connection", "zapier:<connection-id>"` (or `"env:<ENV_VAR>"` with `"env": { "<ENV_VAR>": "xxx" }`) to `args` to set a default.

### Cloning the source

You don't need to clone anything to use this connector — the options above already cover that. Want the actual repo source instead, to read the script code, browse `references/`, run this connector's tests, or hack on it? Clone with a path filter so you only fetch this one connector, not the whole catalog:

```bash
git clone --filter=blob:none --sparse https://github.com/zapier/connectors.git
cd connectors && git sparse-checkout set apps/algolia
cd apps/algolia && npm install
```

See the [main README](https://github.com/zapier/connectors#cloning-the-source) to clone several connectors at once.

## Scripts

<!-- BEGIN:readme-scripts-table -->

| Script                | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| searchIndex           | Search one index for records matching a query, with filters and facets. |
| searchMultipleIndices | Run several search queries in one request (federated / multi-index).    |
| browseObjects         | Cursor-traverse every record in an index (export / reindex).            |
| getObject             | Retrieve a single record by object ID.                                  |
| getObjects            | Retrieve multiple records by object ID, optionally across indices.      |
| searchForFacetValues  | Search the values of one faceted attribute.                             |

**Index records (write)**

| Script              | Description                                                          |
| ------------------- | -------------------------------------------------------------------- |
| saveObject          | Add a record; Algolia assigns an object ID if omitted.               |
| addOrUpdateObject   | Add or fully replace a record at a specific object ID (upsert).      |
| partialUpdateObject | Update specific attributes on a record without replacing it.         |
| deleteObject        | Delete a single record by object ID.                                 |
| batch               | Run many record operations against one index in one request.         |
| multipleBatch       | Run record operations across several indices in one request.         |
| deleteBy            | Delete records in an index matching a filter (a filter is required). |
| clearObjects        | Delete all records in an index, keeping its config.                  |

**Indices & settings**

| Script          | Description                                                 |
| --------------- | ----------------------------------------------------------- |
| listIndices     | List the indices in the application.                        |
| deleteIndex     | Permanently delete an index (records + config).             |
| copyOrMoveIndex | Copy or move (rename) an index; overwrites the destination. |
| getSettings     | Read an index's settings (relevance, faceting, ranking).    |
| setSettings     | Update an index's settings (merged with existing).          |

**Synonyms & query rules**

| Script                                                                    | Description                                |
| ------------------------------------------------------------------------- | ------------------------------------------ |
| saveSynonym / getSynonym / searchSynonyms / deleteSynonym / clearSynonyms | CRUD + search for synonyms in an index.    |
| saveRule / getRule / searchRules / deleteRule                             | CRUD + search for query rules in an index. |

**Recommend & tasks**

| Script                                  | Description                                                   |
| --------------------------------------- | ------------------------------------------------------------- |
| getRecommendations                      | Read AI recommendations from a Recommend model.               |
| getRecommendRule / searchRecommendRules | Read Recommend rules for an index + model.                    |
| getTask                                 | Check an async indexing task's status (poll until published). |

<!-- END:readme-scripts-table -->

Run `npx @zapier/algolia-connector@latest run <script> --help` to see any script's exact input contract + the available resolvers.

## Usage

Each named export is the consumer-facing `(input, opts) => Promise<{ data, meta }>` function. Pass auth as one `[<resolver>:]<value>` string, e.g. `{ connection: "env:<ENV_VAR>" }`.

<!-- BEGIN:readme-usage-example -->

```ts
import { searchIndex } from "@zapier/algolia-connector";

// ALGOLIA_APPLICATION_ID and ALGOLIA_API_KEY are set in the environment.
const { data, meta } = await searchIndex(
  { indexName: "products", query: "wireless earbuds", hitsPerPage: 5 },
  { connection: "algolia:ALGOLIA" },
);
console.log(data.hits, meta.outputDataValidation);
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
- [Source](https://github.com/zapier/connectors/tree/main/apps/algolia)

<!-- BEGIN:readme-links-extra -->

- [Algolia Search REST API](https://www.algolia.com/doc/rest-api/search) · [Recommend REST API](https://www.algolia.com/doc/rest-api/recommend)

<!-- END:readme-links-extra -->

<!-- BEGIN:readme-footer? -->
<!-- legal:footer -->

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Algolia's API, services, data, schemas, documentation, or other materials, which remain the property of Algolia. Your use of Algolia's API is governed by your own agreement with Algolia.

**Trademarks and affiliation.** Algolia and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Algolia.

**Your responsibility.** This connector calls Algolia's API using credentials you supply. You are responsible for holding a valid Algolia account, for complying with Algolia's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Algolia product. Zapier is not responsible for changes Algolia makes to its API or for any consequence of your use of Algolia's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
<!-- /legal:footer -->
<!-- END:readme-footer -->
