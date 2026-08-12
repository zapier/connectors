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

<!-- BEGIN:skill-intro -->

Agent-callable tools for [Clay](https://www.clay.com/), the spreadsheet-style go-to-market data platform. This connector gets structured data **into** Clay tables and reads specific rows back out: create and update rows, find rows by field value, list a view's rows, and navigate the workspace → table → view → record hierarchy so you can resolve the identifiers those writes need. A workspace holds tables, a table holds rows of typed cells, and views define which columns are visible. Authentication is a single long-lived Clay API key.

<!-- legal:disclaimer -->

_Independent, unofficial connector for Clay. Not affiliated with, endorsed by, or sponsored by Clay. "Clay" is a trademark of its owner, used only to identify the service this connector works with._
<!-- /legal:disclaimer -->
<!-- END:skill-intro -->

## When to use this

<!-- BEGIN:skill-use-cases -->

- **Write to a Clay table** — add a new row (`createRecord`) or change cells on an existing one (`updateRecord`), e.g. push a lead or enrichment result into a table.
- **Look a row up** — find rows by matching field values (`findRecord`) or page through a view (`listRecords`), e.g. to get a `recordId` before updating.
- **Resolve ids and schema** — navigate workspaces, tables, views, and members (`listWorkspaces`, `listTables`, `getTable`, `listWorkspaceUsers`, `getCurrentUser`) to discover the `tableId`, `viewId`, field ids, select-option ids, and user ids that writes and filters require.
- **Not for** — building tables/views/columns, running enrichments on demand, or bulk export; those aren't exposed here.

<!-- END:skill-use-cases -->

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill clay` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                               | Load                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__clay__<tool>`), or you can register a local server yourself (or guide the user to)          | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                         | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Clay API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

<!-- BEGIN:skill-connections-note? -->

All scripts use the single `clay` connection. Cell and filter values are keyed by field id (`f_…`); discover valid field ids, types, and select-option ids with `getTable`, and user ids with `listWorkspaceUsers`.
<!-- END:skill-connections-note -->

<!-- BEGIN:skill-scripts-table -->

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

<!-- END:skill-scripts-table -->

<!-- BEGIN:disambiguation-and-refusals? -->

## Disambiguation & refusals

- **Before updating a row looked up by name, confirm the match.** `findRecord` / `listRecords` can return several rows that share a value (e.g. two records with the same company or person name). Count exact (case-insensitive) matches on the field you searched: exactly one → act on it, don't over-ask; two or more that tie → stop, list the candidates with a distinguishing field (another cell value or the record id), and ask which one before calling `updateRecord`. Never silently pick the first.
  - **Always re-resolve the row with a fresh `findRecord` at update time — never reuse a `recordId` you created or saw earlier in the conversation.** A row you added moments ago may no longer be unique (another row with the same value may have been added since), so a stale id hides the ambiguity. Search by the named value again, then apply the count rule above before writing.
- **Don't fake unsupported operations.** This connector cannot create or delete tables, views, or columns, run an enrichment on demand, or delete rows — there is no tool for those. If asked, say it's unsupported and stop; do not substitute a different tool (e.g. writing a new row in place of deleting one) and report it as done.

<!-- END:disambiguation-and-refusals -->

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

<!-- BEGIN:skill-auth-notes -->

Zapier-managed auth is not yet verified for Clay — prefer the direct token (`env:<ENV_VAR>`) until it is confirmed.
<!-- END:skill-auth-notes -->

No connection yet? Pick one — and follow the reference's own flow to obtain it; never just ask the user for a connection id or token as if they already have one memorized:

|                                      | Load                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------- |
| Pass the credential directly         | [`references/use-without-zapier.md`](references/use-without-zapier.md) |
| Route it through a Zapier connection | [`references/use-with-zapier.md`](references/use-with-zapier.md)       |

## Output format

Every script returns a `{ data, meta }` envelope:

- **`data`** — the script's result (the shape its `outputSchema` declares; see the reference you loaded above for how to inspect a script's exact schema in your shape).
- **`meta.outputDataValidation`** — what validating `data` did:
  - `{ skipped: false, droppedPaths: null }` — validated, nothing removed.
  - `{ skipped: false, droppedPaths: [...], instruction }` — validated, but those paths were stripped from `data`: fields the script returned from the API that the `outputSchema` doesn't declare. If you need them, re-run with output validation skipped.
  - `{ skipped: true }` — validation was bypassed; `data` is the raw, unchecked script output.

**Reading dropped fields / `skipOutputDataValidation`.** To receive the raw, unvalidated result, opt out of output validation (the exact syntax differs by shape — see the reference you loaded above). Input validation is never skipped.

**Trimming the result / `filterOutputData`.** To shrink a large result down to the fields you need, pass a jq expression that post-processes `data` (again, exact syntax per shape). The jq runs against `data` only, NOT the `{ data, meta }` envelope, so write it rooted at `data` (run the script's `--help` — or your shape's equivalent — to see its output schema). The transformed value replaces `data`, `meta` is preserved, and the result is NOT re-validated against the output schema.

<!-- BEGIN:skill-references-table -->

## References

Load the matching reference file before working in that area:

| Reference                                               | Load when                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [clay-api-gotchas.md](./references/clay-api-gotchas.md) | A call fails or behaves unexpectedly — the raw `authorization` header (no `Bearer`), the undocumented `api.clay.com/v3` table surface, the user→workspace→table→view id chain, field-id/cell shape, the `/find` filter DSL, limit-only paging, or when writes consume Clay credits. |
| [use-as-recipe.md](./references/use-as-recipe.md)       | A harness writing its own code against the Clay API (can't load the tools, run the CLI, or import the package) needs the request/response shapes and critical rules.                                                                                                                |

<!-- END:skill-references-table -->
