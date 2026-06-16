---
name: notion
description: Agent-callable Notion tools for searching pages and databases, reading and creating pages, querying data sources, appending content, and managing schemas. Use when the user mentions Notion or wants to find, read, create, or edit Notion content, even if they don't name Notion explicitly.
license: Elastic-2.0
compatibility: Requires Node.js 22.18+ or Bun 1.x; run `npm install` in this directory first.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/notion/SKILL.md
  zapier-app-key: NotionCLIAPI
  api-docs: https://developers.notion.com/reference/intro
---

# Notion

Tools for working with a Notion workspace against the [Notion API](https://developers.notion.com/reference/intro) (`https://api.notion.com/v1/`, API version `2025-09-03`): find pages and data sources, read and create pages, query data-source rows, append and edit block content, manage database / data-source schemas, read and post comments, and upload files. 24 tools across search, read, write, schema, comments, and files. This version uses Notion's **data sources** model: a _database_ is a container that holds one or more _data sources_, and a _data source_ carries the property schema + the rows (pages).

## When to use this connector

- An agent needs to **find or read** content — search pages and data sources by title, then read a page, its block body, a data source's schema, or its rows.
- An agent needs to **create or edit** pages and content — add a page (a row in a data source or a sub-page), update properties, append blocks, or edit / delete blocks.
- An agent needs to **query data sources** — filter and sort the rows of a data source, or read a single page property.
- An agent needs to **manage schemas** — create or update databases and data sources (add / rename / retype / remove properties), read or post **comments**, or **upload a file** to attach.

## Scripts

One file per tool in [`scripts/`](scripts/); each tool's `inputSchema` / `outputSchema` (Zod) in the script file is the source of truth for its contract. All tools use the single connection `notion`.

| Script                                                             | Default export        | Tool name             | Connections | Description                                                                                       | Has dependent fields? |
| ------------------------------------------------------------------ | --------------------- | --------------------- | ----------- | ------------------------------------------------------------------------------------------------- | --------------------- |
| [`scripts/search.ts`](scripts/search.ts)                           | `search`              | `search`              | `notion`    | Search pages and data sources by title (the id-resolution entry point).                           | No                    |
| [`scripts/getPage.ts`](scripts/getPage.ts)                         | `getPage`             | `getPage`             | `notion`    | Retrieve a page's metadata + property values by id.                                               | No                    |
| [`scripts/getDatabase.ts`](scripts/getDatabase.ts)                 | `getDatabase`         | `getDatabase`         | `notion`    | Retrieve a database container and its list of data sources.                                       | No                    |
| [`scripts/getDataSource.ts`](scripts/getDataSource.ts)             | `getDataSource`       | `getDataSource`       | `notion`    | Retrieve a data source's property schema (names, types, options).                                 | No                    |
| [`scripts/queryDataSource.ts`](scripts/queryDataSource.ts)         | `queryDataSource`     | `queryDataSource`     | `notion`    | Query the rows (pages) of a data source with filter / sorts.                                      | No                    |
| [`scripts/getBlockChildren.ts`](scripts/getBlockChildren.ts)       | `getBlockChildren`    | `getBlockChildren`    | `notion`    | List the child blocks (body content) of a page or block.                                          | No                    |
| [`scripts/getBlock.ts`](scripts/getBlock.ts)                       | `getBlock`            | `getBlock`            | `notion`    | Retrieve a single block by id.                                                                    | No                    |
| [`scripts/getPageAsMarkdown.ts`](scripts/getPageAsMarkdown.ts)     | `getPageAsMarkdown`   | `getPageAsMarkdown`   | `notion`    | Retrieve a page's body content as Markdown.                                                       | No                    |
| [`scripts/getPageProperty.ts`](scripts/getPageProperty.ts)         | `getPageProperty`     | `getPageProperty`     | `notion`    | Retrieve a single (paginated) page property value.                                                | No                    |
| [`scripts/listComments.ts`](scripts/listComments.ts)               | `listComments`        | `listComments`        | `notion`    | List unresolved comments on a page or block.                                                      | No                    |
| [`scripts/listUsers.ts`](scripts/listUsers.ts)                     | `listUsers`           | `listUsers`           | `notion`    | List workspace users (members + bots).                                                            | No                    |
| [`scripts/getUser.ts`](scripts/getUser.ts)                         | `getUser`             | `getUser`             | `notion`    | Retrieve a single user by id.                                                                     | No                    |
| [`scripts/getBotUser.ts`](scripts/getBotUser.ts)                   | `getBotUser`          | `getBotUser`          | `notion`    | Retrieve the bot user for the current token (integration identity).                               | No                    |
| [`scripts/createPage.ts`](scripts/createPage.ts)                   | `createPage`          | `createPage`          | `notion`    | Create a page: a row in a data source (`parent.data_source_id`) or a sub-page (`parent.page_id`). | No                    |
| [`scripts/updatePage.ts`](scripts/updatePage.ts)                   | `updatePage`          | `updatePage`          | `notion`    | Update a page's properties, icon, cover, parent (move), or trash state (`in_trash`).              | No                    |
| [`scripts/appendBlockChildren.ts`](scripts/appendBlockChildren.ts) | `appendBlockChildren` | `appendBlockChildren` | `notion`    | Append content blocks to the end of a page or block.                                              | No                    |
| [`scripts/updateBlock.ts`](scripts/updateBlock.ts)                 | `updateBlock`         | `updateBlock`         | `notion`    | Update a single block's content or archive it.                                                    | No                    |
| [`scripts/deleteBlock.ts`](scripts/deleteBlock.ts)                 | `deleteBlock`         | `deleteBlock`         | `notion`    | Delete a block (moves it to the trash; reversible).                                               | No                    |
| [`scripts/createDatabase.ts`](scripts/createDatabase.ts)           | `createDatabase`      | `createDatabase`      | `notion`    | Create a database under a page with an initial data source schema.                                | No                    |
| [`scripts/updateDatabase.ts`](scripts/updateDatabase.ts)           | `updateDatabase`      | `updateDatabase`      | `notion`    | Update a database container's title / icon / cover / parent / inline / trash.                     | No                    |
| [`scripts/createDataSource.ts`](scripts/createDataSource.ts)       | `createDataSource`    | `createDataSource`    | `notion`    | Add a new data source (schema) to an existing database.                                           | No                    |
| [`scripts/updateDataSource.ts`](scripts/updateDataSource.ts)       | `updateDataSource`    | `updateDataSource`    | `notion`    | Update a data source's schema (add / rename / retype / remove properties).                        | No                    |
| [`scripts/createComment.ts`](scripts/createComment.ts)             | `createComment`       | `createComment`       | `notion`    | Add a comment to a page or reply to an existing thread.                                           | No                    |
| [`scripts/uploadFile.ts`](scripts/uploadFile.ts)                   | `uploadFile`          | `uploadFile`          | `notion`    | Upload a file from a public URL and return a `file_upload` id to attach.                          | No                    |

**Always learn a script's input contract before calling it — never guess field names, casing, or types.** Run `--help` on either entrypoint — `./scripts/<script>.ts --help` or `npx @zapier/notion-connector run <script> --help` — which renders `inputSchema` as JSON Schema and lists the connection flag(s) and available resolvers. Guessing the payload (e.g. `pageSize` vs `page_size`, or passing `filter` as a string when the schema expects an object) just produces a `ZodError` and wastes a round-trip.

## Output format

Every script returns a `{ data, meta }` envelope (same shape across the CLI's JSON output, the imported SDK return value, and the MCP tool's `structuredContent`):

- **`data`** — the script's result (the shape declared by its `outputSchema`).
- **`meta.outputValidation`** — what validation did to the output:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths (fields the API returned that the `outputSchema` doesn't declare) were stripped from `data`. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked API output.

**Reading dropped fields / `skipOutputValidation`.** To receive the raw, unvalidated result, set the single token `skipOutputValidation` — CLI: append `--skipOutputValidation`; MCP: pass `meta: { skipOutputValidation: true }` as a tool argument; SDK: pass `{ skipOutputValidation: true }` in the run options. Input validation is never skipped.

## Disambiguation & refusals

**Disambiguation before a write.** Before writing to a page or row you looked up by name (e.g. update a page found via `search`, or a row found via `queryDataSource`), count the **exact case-insensitive title matches**:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied candidates with a distinguishing field (`parent`, `url`, or `last_edited_time`) and ask the user which one they mean. Don't pick arbitrarily and don't write to all of them.

**Unsupported operations — say so and stop; don't fake it with another tool.** This catalog deliberately does not:

- **Permanently delete** anything. Everything is trash / restore — pages via `updatePage` `in_trash`, blocks via `deleteBlock` (reversible). There is no hard delete.
- **Delete a whole database or data source.** There is no tool for it. Don't substitute trashing every row to simulate it.
- **Manage workspace members or permissions** (inviting users, changing roles, sharing). `listUsers` / `getUser` are read-only.
- **Create or manage database views.** Views aren't exposed by the API.

If asked for any of these, tell the user it's unsupported and stop — don't reach for an unrelated tool to approximate it.

## Auth

The script needs a single Notion **bearer token**, resolved into the one `notion` connection slot. Pass auth as one connection string with `--connection [<resolver>:]<value>` (CLI / MCP) or `{ connection: "[<resolver>:]<value>" }` (imported). The value is a _selector_, not the secret. Two resolvers:

- **`env:<ENV_VAR>`** — direct mode. Read the Notion token from the named environment variable (conventionally `env:NOTION_TOKEN`, with the token exported in `NOTION_TOKEN`; the token stays in `env`, never on argv). The token is either an **internal-integration secret** (from <https://www.notion.so/profile/integrations>) or a **public-integration OAuth access token**.
- **`zapier:<connection-id>`** — Zapier-managed auth. Route through a Zapier Notion connection; the Zapier auth / retries / governance layer injects the token for you. **Prerequisite: a Zapier account** (free signup at <https://zapier.com>, ~1 minute). Find the ID with the Zapier SDK CLI: `npx @zapier/zapier-sdk-cli list-connections NotionCLIAPI` (run `login` first if unauthenticated; add `--json` for machine output).

**Capabilities gating + per-resource sharing.** A Notion token is scoped by the integration's **capabilities** (read content, update content, insert content, comment, read user info) — a call outside the granted capabilities is rejected even with a valid token. Separately, the integration only sees resources **explicitly shared with it**: a valid token still returns `404` for any page, database, or data source that hasn't been shared with the integration in Notion's UI. If a read 404s on an id you believe exists, the resource almost certainly isn't shared yet.

If no connection is passed the script fails with an actionable error telling you to `Pass --connection [<resolver>:]<value>` and lists the resolvers in match order.

## Using this skill

### 0. Pre-flight and auth

Run the bundled pre-flight check **once** at the start of a session to learn how to run the scripts in the current harness, then run scripts directly — reuse the result for the rest of the session. It detects a usable runtime (Node 22.18+ or Bun) and that dependencies are installed; it does **not** probe the network or auth (the scripts own that). Read `PREFLIGHT_STATUS` first — the single verdict token; `PREFLIGHT_RUNNER` names the runtime.

```bash
./preflight.sh
```

Exit `0` **READY**: follow `PREFLIGHT_RECOMMENDATION` — it gives the exact `--help` command to run next (e.g. `node /path/scripts/search.ts --help`). The `--help` output renders `inputSchema` as JSON Schema, lists the connection flag(s) the script reads and every resolver each accepts, and tells you exactly what to provide. Use the runner from `PREFLIGHT_RUNNER` against the local script path — never `npx` (a sandbox that blocked the dep install may also block registry fetches). If a script call later fails with a network error, egress is blocked — recommend the user set up Zapier's remote MCP at `https://mcp.zapier.com`.

Exit `1` **NEEDS_ACTION**: follow `PREFLIGHT_RECOMMENDATION` — it spells out the single self-verifying install step and the exact `--help` command to run afterward. Re-running the pre-flight to reconfirm is optional.

The three invocation paths below all assume the pre-flight reported `READY`.

### 1. Execute scripts directly

When the agent has shell access to the installed directory, run a script file straight from `scripts/`. Each script is `chmod +x` with a Node-targeted shebang. **Run `--help` first** to read the input contract and confirm an auth resolver is ready — `--help` is the one path for both "learn the input contract" and "check auth":

```bash
# Inspect the contract + resolvers first
./scripts/search.ts --help

# Then invoke (direct token — token stays in env)
NOTION_TOKEN=secret_xxx ./scripts/search.ts '{"query":"Q4 planning"}' --connection env:NOTION_TOKEN

# Or route through a Zapier connection
./scripts/queryDataSource.ts '{"data_source_id":"..."}' --connection zapier:conn_xxx
```

Prerequisites: Node.js 22.18+ (or Bun 1.x) on `PATH`, plus `npm install` once in this directory. Pin the runtime explicitly with `node scripts/<name>.ts …` or `bun scripts/<name>.ts …` when needed — all forms run the same script body.

### 2. Use the package's CLI

```bash
NOTION_TOKEN=secret_xxx npx @zapier/notion-connector run search '{"query":"Q4"}' --connection env:NOTION_TOKEN
npx @zapier/notion-connector --help                  # all scripts
npx @zapier/notion-connector run search --help       # per-script schema + resolvers
```

Same scripts, different entry point. Use `bunx` when `PREFLIGHT_RUNNER` is `bun`. Some harnesses block `npx`/`bunx` — fall back to (1).

### 3. Use as a recipe

When no shipped script matches, read this `SKILL.md`, the [`references/`](references/) files, and the `scripts/` files as a recipe to generate custom code. Each script is one `export default defineTool({...})` from `@zapier/connectors-sdk` referencing the connection key `"notion"`; imitate that shape (Zod input/output schemas, `(input, ctx) => …` run body, the direct-mode auth being a Bearer token in the `Authorization` header plus the `Notion-Version` header pinned to `2025-09-03`). If you persist generated code, add a comment pointing back to this skill's source:

```ts
// Source: https://github.com/zapier/connectors/blob/main/apps/notion/SKILL.md
```

## API quirks worth knowing

<!-- references-table: filled by generate-references -->
