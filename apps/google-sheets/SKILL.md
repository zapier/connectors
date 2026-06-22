---
name: google-sheets
description: Agent-callable Google Sheets tools — read and write spreadsheet data as rows or raw cells, manage worksheets and columns, and apply formatting, sorting, and validation. Use when the user mentions Google Sheets or wants to read, add, update, look up, or organize spreadsheet data, even if they don't name Sheets explicitly.
license: Elastic-2.0
compatibility: Requires Node.js 22.18+ or Bun 1.x; run `npm install` in this directory first.
metadata:
  title: Google Sheets
  source: https://github.com/zapier/connectors/blob/main/apps/google-sheets/SKILL.md
  zapier-app-key: GoogleSheetsV2CLIAPI
  api-docs: https://developers.google.com/workspace/sheets/api/reference/rest
---

# Google Sheets

_Independent, unofficial connector for Google Sheets. Not affiliated with, endorsed by, or sponsored by Google Sheets. "Google Sheets" is a trademark of its owner, used only to identify the service this connector works with._

Tools for working with Google Sheets against the [Google Sheets API v4](https://developers.google.com/workspace/sheets/api/reference/rest) (`https://sheets.googleapis.com/v4/`), with spreadsheet discovery via the [Google Drive API](https://developers.google.com/drive/api/reference/rest/v3/files/list). 26 tools across two complementary surfaces: a **record surface** — rows as objects keyed by their column headers (the "log this expense", "update the status to Done", "look up last quarter's total" jobs) — and a **cell surface** — raw A1-addressed values for formulas, precise numeric/text control, and arbitrary ranges. Plus spreadsheet/worksheet structure and presentation (formatting, sorting, validation).

## When to use this connector

- **Read or find data inside a spreadsheet** — look up a row by a column value (`lookupRow`), find all matching rows (`findRows`), list a window of rows (`listRows`), or read a raw range (`getValues`).
- **Write data** — append a row or many rows (`createRow` / `createRows`), update specific columns of a row without disturbing the others (`updateRow` / `updateRows`), or write a raw range / formula (`updateValues`).
- **Clear or delete** — clear a row's contents but keep the row (`clearRows` / `clearValues`) or remove rows entirely (`deleteRows`).
- **Manage structure** — create a spreadsheet (`createSpreadsheet`), add / list / copy / rename / hide / delete worksheets, add columns.
- **Format & validate** — number/date/currency formats, text styling, sort a range, copy a range, dropdowns and number/date validation, conditional formatting.

## Scripts

One file per tool in [`scripts/`](scripts/); each tool's `inputSchema` / `outputSchema` (Zod) in the script file is the source of truth for its contract. All tools use the single connection `google-sheets`.

| Script                                                                         | Tool name                   | Connections     | Description                                                                       |
| ------------------------------------------------------------------------------ | --------------------------- | --------------- | --------------------------------------------------------------------------------- |
| [`scripts/createSpreadsheet.ts`](scripts/createSpreadsheet.ts)                 | `createSpreadsheet`         | `google-sheets` | Create a new spreadsheet, optionally with worksheets and a header row.            |
| [`scripts/getSpreadsheet.ts`](scripts/getSpreadsheet.ts)                       | `getSpreadsheet`            | `google-sheets` | Get a spreadsheet's metadata and its list of worksheets.                          |
| [`scripts/listSpreadsheets.ts`](scripts/listSpreadsheets.ts)                   | `listSpreadsheets`          | `google-sheets` | Find spreadsheets in Drive by name (needs Drive access; otherwise pass a URL/id). |
| [`scripts/addWorksheet.ts`](scripts/addWorksheet.ts)                           | `addWorksheet`              | `google-sheets` | Add a worksheet (tab), optionally with a header row.                              |
| [`scripts/listWorksheets.ts`](scripts/listWorksheets.ts)                       | `listWorksheets`            | `google-sheets` | List the worksheets (tabs) in a spreadsheet.                                      |
| [`scripts/copyWorksheet.ts`](scripts/copyWorksheet.ts)                         | `copyWorksheet`             | `google-sheets` | Copy a worksheet into another spreadsheet (or the same one).                      |
| [`scripts/updateWorksheetProperties.ts`](scripts/updateWorksheetProperties.ts) | `updateWorksheetProperties` | `google-sheets` | Rename, move, freeze rows/columns, hide, or recolor a worksheet.                  |
| [`scripts/deleteWorksheet.ts`](scripts/deleteWorksheet.ts)                     | `deleteWorksheet`           | `google-sheets` | Permanently delete a worksheet and its data.                                      |
| [`scripts/addColumn.ts`](scripts/addColumn.ts)                                 | `addColumn`                 | `google-sheets` | Insert a column, optionally with a header label.                                  |
| [`scripts/createRow.ts`](scripts/createRow.ts)                                 | `createRow`                 | `google-sheets` | Append a single row, given values keyed by column header.                         |
| [`scripts/createRows.ts`](scripts/createRows.ts)                               | `createRows`                | `google-sheets` | Append multiple rows in one batched call.                                         |
| [`scripts/updateRow.ts`](scripts/updateRow.ts)                                 | `updateRow`                 | `google-sheets` | Update specific columns of a row by row number (leaves other columns untouched).  |
| [`scripts/updateRows.ts`](scripts/updateRows.ts)                               | `updateRows`                | `google-sheets` | Update multiple rows (each by row number) in one batched call.                    |
| [`scripts/lookupRow.ts`](scripts/lookupRow.ts)                                 | `lookupRow`                 | `google-sheets` | Find the first row where a column matches a value.                                |
| [`scripts/findRows.ts`](scripts/findRows.ts)                                   | `findRows`                  | `google-sheets` | Find all rows matching a column/value filter (bounded).                           |
| [`scripts/listRows.ts`](scripts/listRows.ts)                                   | `listRows`                  | `google-sheets` | Read a window of rows as records.                                                 |
| [`scripts/clearRows.ts`](scripts/clearRows.ts)                                 | `clearRows`                 | `google-sheets` | Clear the contents of specific rows (rows stay; nothing shifts).                  |
| [`scripts/deleteRows.ts`](scripts/deleteRows.ts)                               | `deleteRows`                | `google-sheets` | Delete specific rows; everything below shifts up.                                 |
| [`scripts/getValues.ts`](scripts/getValues.ts)                                 | `getValues`                 | `google-sheets` | Read a raw cell range in A1 notation.                                             |
| [`scripts/updateValues.ts`](scripts/updateValues.ts)                           | `updateValues`              | `google-sheets` | Write values to a raw cell range (RAW or USER_ENTERED).                           |
| [`scripts/clearValues.ts`](scripts/clearValues.ts)                             | `clearValues`               | `google-sheets` | Clear the values in a raw cell range (formatting stays).                          |
| [`scripts/formatCells.ts`](scripts/formatCells.ts)                             | `formatCells`               | `google-sheets` | Apply number/date/currency formatting or text styling to a range.                 |
| [`scripts/sortRange.ts`](scripts/sortRange.ts)                                 | `sortRange`                 | `google-sheets` | Sort a range by one or more columns.                                              |
| [`scripts/copyRange.ts`](scripts/copyRange.ts)                                 | `copyRange`                 | `google-sheets` | Copy a range (values + formatting) to another location.                           |
| [`scripts/setDataValidation.ts`](scripts/setDataValidation.ts)                 | `setDataValidation`         | `google-sheets` | Set a dropdown / number / date validation rule on a range.                        |
| [`scripts/addConditionalFormatRule.ts`](scripts/addConditionalFormatRule.ts)   | `addConditionalFormatRule`  | `google-sheets` | Add a conditional-formatting rule to a range.                                     |

**Always learn a script's input contract before calling it — never guess field names, casing, or types.** Run `--help` on a script — `./scripts/<script>.ts --help` or `npx @zapier/google-sheets-connector run <script> --help` — which renders `inputSchema` as JSON Schema and lists the connection flag and resolvers.

## Output format

Every script returns a `{ data, meta }` envelope (same shape across the CLI's JSON output, the imported SDK return value, and the MCP tool's `structuredContent`):

- **`data`** — the script's result (the shape declared by its `outputSchema`).
- **`meta.outputValidation`** — what validating `data` did: `{ skipped: false, droppedPaths: null }` (validated, nothing removed), `{ skipped: false, droppedPaths: [...] }` (validated, those API-returned-but-undeclared paths stripped), or `{ skipped: true }` (validation bypassed; `data` is raw).

To receive the raw, unvalidated result, pass the single token `skipOutputValidation` — CLI: `--skipOutputValidation`; MCP: `meta: { skipOutputValidation: true }` as a tool argument; SDK: `{ skipOutputValidation: true }` in run options. Input validation is never skipped.

## Disambiguation & refusals

**Disambiguation before a write.** Before writing to a row you found by a column value (e.g. update a row located via `lookupRow`, or act on a spreadsheet found via `listSpreadsheets`), count the **exact case-insensitive matches**:

- **Exactly one match** — act on it. Don't over-ask; a single unambiguous match is the answer.
- **Two or more that tie** — stop. List the tied rows (or spreadsheets) with a distinguishing field (another column value, the spreadsheet's modified time / URL) and ask which one. Don't pick arbitrarily, and don't write to all of them.

Row numbers are **not stable** — they shift on insert/delete/sort. To target the same logical record across runs, match on a unique key column with `lookupRow`, not a remembered row number.

**Confirm before destructive or bulk-overwrite operations.** `deleteWorksheet`, `deleteRows`, `clearRows`, and `clearValues` remove data; `updateValues` can overwrite it. Confirm the exact target with the user first, and never delete / clear / overwrite more than asked.

**Unsupported operations — say so and stop; don't fake it with another tool.** This catalog deliberately does not:

- **Create or manage charts, pivot tables, named ranges, protected ranges, or filters.** There is no tool for these; don't approximate them with formatting.
- **Find-or-create in one step.** Compose it: `lookupRow` → if not found, `createRow`.
- **Permanently delete a whole spreadsheet.** Worksheet deletion (`deleteWorksheet`) is the only structural delete.

If asked for any of these, tell the user it's unsupported and stop.

## Using this skill

### 0. Pre-flight and auth

Run the bundled pre-flight check **once** at the start of a session, then run scripts directly. It detects a usable runtime (Node 22.18+ or Bun) and that dependencies are installed; it does **not** probe the network or auth (the scripts own that).

```bash
./preflight.sh
```

Read `PREFLIGHT_STATUS` (the verdict) and `PREFLIGHT_RUNNER` (the runtime). On `READY`, follow `PREFLIGHT_RECOMMENDATION` — it gives the exact `--help` command to run next. On `NEEDS_ACTION`, it spells out the single install step.

### 1. Execute scripts directly

Run a script file straight from `scripts/`. **Run `--help` first** — it renders the `inputSchema` as JSON Schema, annotates each connection's env vars `[set]` / `[not set]`, and marks the recommended auth option `[READY — use this]`. It's the one path for both "learn the input contract" and "check auth":

```bash
# Inspect the contract + auth status first
./scripts/lookupRow.ts --help

# Then invoke (direct token — token stays in env)
GOOGLE_SHEETS_ACCESS_TOKEN=ya29.xxx ./scripts/lookupRow.ts \
  '{"spreadsheet":"https://docs.google.com/spreadsheets/d/1AbC.../edit","worksheet":"Sheet1","column":"Email","value":"sam@example.com"}' \
  --connection env:GOOGLE_SHEETS_ACCESS_TOKEN

# Or route through a Zapier connection
./scripts/createRow.ts '{"spreadsheet":"1AbC...","worksheet":"Sheet1","values":{"Name":"Sam","Status":"Open"}}' --connection zapier:<connection-id>
```

Prerequisites: Node.js 22.18+ (or Bun 1.x) on `PATH`, plus `npm install` once in this directory.

### 2. Use the package's CLI

```bash
GOOGLE_SHEETS_ACCESS_TOKEN=ya29.xxx npx @zapier/google-sheets-connector run getValues '{"spreadsheet":"1AbC...","range":"Sheet1!A1:D10"}' --connection env:GOOGLE_SHEETS_ACCESS_TOKEN
npx @zapier/google-sheets-connector run lookupRow --help    # per-script schema + resolvers
```

Use `bunx` when `PREFLIGHT_RUNNER` is `bun`. Some harnesses block `npx`/`bunx` — fall back to (1).

### 3. Use as a recipe

When no shipped script matches, read this `SKILL.md`, the `references/` files, and the `scripts/` files as a recipe to generate custom code. Each script is one `export default defineTool({...})` from `@zapier/connectors-sdk` referencing the connection key `"google-sheets"`; imitate that shape (Zod input/output schemas, a `(input, ctx) => …` run body, the bearer token in the `Authorization` header).

## Auth

The connector needs a single Google **OAuth 2.0 access token**, resolved into the one `google-sheets` connection slot. Pass auth as one connection string with `--connection [<resolver>:]<value>` (CLI / MCP) or `{ connection: "[<resolver>:]<value>" }` (imported). Two resolvers:

- **`zapier:<connection-id>`** — Zapier-managed auth (recommended). Route through a Zapier Google Sheets connection; the Zapier auth / retries / governance layer injects the token and refreshes it for you. The connection grants Sheets + Drive access, so every tool — including `listSpreadsheets` — works. Find the id with `npx @zapier/zapier-sdk-cli list-connections GoogleSheetsV2CLIAPI`.
- **`env:<ENV_VAR>`** — direct mode. Read a Google OAuth access token from the named env var (conventionally `env:GOOGLE_SHEETS_ACCESS_TOKEN`), sent as `Authorization: Bearer`. **Google access tokens expire ~1 hour after issue and are not auto-refreshed in direct mode** — suited to short-lived / testing use. The token needs the `https://www.googleapis.com/auth/spreadsheets` scope (and `drive.file` for the spreadsheets you create / open). `listSpreadsheets` additionally needs a broader Drive read scope (`drive.readonly` / `drive`); without it, pass a spreadsheet URL or id directly to the other tools instead of finding by name.

If no connection is passed the script fails with an actionable error telling you to `Pass --connection [<resolver>:]<value>` and lists the resolvers.

## API quirks worth knowing

| Reference file                                                                           | When to load                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`references/google-sheets-api-gotchas.md`](references/google-sheets-api-gotchas.md)     | Before any call that might fail (error recovery, rate-limit retry, batchUpdate atomicity), when working with row deletion or append logic, or when encountering 400/403/404/429 errors.          |
| [`references/google-sheets-a1-and-values.md`](references/google-sheets-a1-and-values.md) | Before reading or writing cell values — especially when choosing RAW vs USER_ENTERED, interpreting serial-number dates, handling ragged rows, or constructing A1 ranges with sheet-name quoting. |
