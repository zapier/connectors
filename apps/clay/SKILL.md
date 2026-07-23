---
name: clay
description: Agent-callable Clay tools — create, update, and find rows in Clay tables, and navigate workspaces, tables, views, and users. Use when the user mentions Clay or wants to add, update, or look up rows in a Clay table, even if they don't name Clay explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  source: https://github.com/zapier/connectors/blob/main/apps/clay/SKILL.md
  title: Clay
  api-docs: https://developers.clay.com/
  zapier-app-key: ClayCLIAPI
---

# Clay

_Independent, unofficial connector for Clay. Not affiliated with, endorsed by, or sponsored by Clay. "Clay" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable tools for [Clay](https://www.clay.com/), the spreadsheet-style go-to-market data platform. This connector gets structured data **into** Clay tables and reads specific rows back out: create and update rows, find rows by field value, list a view's rows, and navigate the workspace → table → view → record hierarchy so you can resolve the identifiers those writes need. A workspace holds tables, a table holds rows of typed cells, and views define which columns are visible. Authentication is a single long-lived Clay API key.

## When to use this

- **Write to a Clay table** — add a new row (`createRecord`) or change cells on an existing one (`updateRecord`), e.g. push a lead or enrichment result into a table.
- **Look a row up** — find rows by matching field values (`findRecord`) or page through a view (`listRecords`), e.g. to get a `recordId` before updating.
- **Resolve ids and schema** — navigate workspaces, tables, views, and members (`listWorkspaces`, `listTables`, `getTable`, `listWorkspaceUsers`, `getCurrentUser`) to discover the `tableId`, `viewId`, field ids, select-option ids, and user ids that writes and filters require.
- **Not for** — building tables/views/columns, running enrichments on demand, or bulk export; those aren't exposed here.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

**If this connector is already exposed to you as callable tools** (e.g. `mcp__clay__<tool>`), that's a valid path — call them directly. Everything below is only for standalone terminal use when no such tools are loaded.

If the connector has not been installed as a skill yet, install it first with `npx skills zapier/connectors --skill clay` (or your harness's own skill-install mechanism), then continue here.

The connector runs on **Node.js 22.18+** and needs a one-time `npm install` in this directory. `cli.js` is the entry point — list every script with `node cli.js --help`, then learn a script's inputs and connections with `node cli.js run <script> --help`. On older Node, run `node cli.js --help` anyway: it detects your runtime and prints how to run without upgrading (the prebuilt npm package, or another runtime) — don't skip the connector just because Node is old.

`cli.js` self-checks readiness before running: if dependencies aren't installed it exits non-zero with the exact install command (it disambiguates a read-only directory from a sandbox-blocked package cache). Run that, then re-run your command.

## Scripts

All scripts use the single `clay` connection. Cell and filter values are keyed by field id (`f_…`); discover valid field ids, types, and select-option ids with `getTable`, and user ids with `listWorkspaceUsers`.

| Script                          | Script name          | Connections | Description                                                                   |
| ------------------------------- | -------------------- | ----------- | ----------------------------------------------------------------------------- |
| `scripts/createRecord.ts`       | `createRecord`       | `clay`      | Add a new row to a table. May run enrichment columns (consumes Clay credits). |
| `scripts/updateRecord.ts`       | `updateRecord`       | `clay`      | Update cell values on an existing row; only the keys you include change.      |
| `scripts/findRecord.ts`         | `findRecord`         | `clay`      | Find rows in a table by matching field values (AND-combined).                 |
| `scripts/listRecords.ts`        | `listRecords`        | `clay`      | List a page of rows from a table view.                                        |
| `scripts/getTable.ts`           | `getTable`           | `clay`      | Describe a table: fields (id, type, select options) and views.                |
| `scripts/listTables.ts`         | `listTables`         | `clay`      | List the tables in a workspace.                                               |
| `scripts/listWorkspaces.ts`     | `listWorkspaces`     | `clay`      | List the workspaces the caller can access.                                    |
| `scripts/listWorkspaceUsers.ts` | `listWorkspaceUsers` | `clay`      | List members of a workspace (resolve a user id).                              |
| `scripts/getCurrentUser.ts`     | `getCurrentUser`     | `clay`      | Return the authenticated caller's user id and email.                          |

## Disambiguation & refusals

- **Before updating a row looked up by name, confirm the match.** `findRecord` / `listRecords` can return several rows that share a value (e.g. two records with the same company or person name). Count exact (case-insensitive) matches on the field you searched: exactly one → act on it, don't over-ask; two or more that tie → stop, list the candidates with a distinguishing field (another cell value or the record id), and ask which one before calling `updateRecord`. Never silently pick the first.
- **Don't fake unsupported operations.** This connector cannot create or delete tables, views, or columns, run an enrichment on demand, or delete rows — there is no tool for those. If asked, say it's unsupported and stop; do not substitute a different tool (e.g. writing a new row in place of deleting one) and report it as done.

## Auth

Pass auth as one connection string with `--connection [<resolver>:]<value>`. The value is a selector, not the secret; the `<resolver>:` prefix is optional (a bare value goes to the first resolver that claims it). Each script declares the connections it needs and the resolvers each accepts — always run `node cli.js run <script> --help` to see them rather than relying on this file.

Clay authenticates with a single long-lived **API key** (in the Clay app under _Settings → Account → API keys_). It needs no browser consent, which suits an agent.

- **Direct token (recommended for v1):** put the key in an environment variable and pass `--connection env:CLAY_API_KEY`. This is the verified path.
- **Zapier-managed:** `--connection zapier:<connection-id>` uses Zapier's managed auth, retries, and governance layer to inject the key. This path is not yet verified for Clay — prefer the direct token until it is confirmed.

The key is the same for every script. Run `node cli.js run <script> --help` to see the connection each script accepts.

## Running scripts

After `npm install`, run a script by name with `node cli.js run <script>`, or execute its file directly — both take the same arguments and both accept `--help`. Always run a script's `--help` first to learn its exact input schema and connections, then invoke it:

```bash
# default — via the entry point; self-checks readiness and prints friendly diagnostics
node cli.js run <script> '<input-json>' --connection [<resolver>:]<value>
# shorthand — runs the script file directly (same args, same Node 22.18+ need, no readiness check)
./scripts/<script>.ts '<input-json>' --connection [<resolver>:]<value>
```

When a harness can't execute scripts directly, fall back to MCP — `node cli.js mcp` serves every script as a tool over stdio. Register it as a local MCP server in your client: the stanza is harness-specific (an `mcpServers` entry in Claude Desktop, Cursor, Claude Code, …) with `command: "node"`, `args: ["cli.js", "mcp"]`, run from this directory. Run `node cli.js mcp --help` for auth options. Add the stanza yourself if you can edit the client's MCP config; otherwise guide the user. If a local server isn't possible, guide the user to use Zapier's remote MCP servers at <https://mcp.zapier.com> instead.

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; run the script's `--help` to see that exact schema).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, append `--skipOutputDataValidation` to the script invocation. Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, append `--filterOutputData '<jq>'` — a jq expression that post-processes `data`. The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

## References

Load the matching reference file before working in that area:

| Reference                                               | Load when                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [clay-api-gotchas.md](./references/clay-api-gotchas.md) | A call fails or behaves unexpectedly — the raw `authorization` header (no `Bearer`), the undocumented `api.clay.com/v3` table surface, the user→workspace→table→view id chain, field-id/cell shape, the `/find` filter DSL, limit-only paging, or when writes consume Clay credits. |
| [use-as-recipe.md](./references/use-as-recipe.md)       | A harness writing its own code against the Clay API (can't load the tools, run the CLI, or import the package) needs the request/response shapes and critical rules.                                                                                                                |
