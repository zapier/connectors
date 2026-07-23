---
name: google-sheets-plg
description: Agent-callable Google Sheets tools — read and write spreadsheet data as rows or raw cells, manage worksheets and columns, and apply formatting, sorting, and validation. Use when the user mentions Google Sheets or wants to read, add, update, look up, or organize spreadsheet data, even if they don't name Sheets explicitly.
license: Elastic-2.0
compatibility: Run `npm install --omit=dev` in this directory, then `node cli.js`. The TypeScript source needs Node.js 22.18+; on older Node, run `cli.js` for build-it-yourself / prebuilt / alternative-runtime options.
metadata:
  title: Google Sheets
  source: https://github.com/zapier/connectors/blob/main/plugins/google-sheets-plg/skills/google-sheets-plg/SKILL.md
  zapier-app-key: GoogleSheetsV2CLIAPI
  api-docs: https://developers.google.com/workspace/sheets/api/reference/rest
---

# Google Sheets

_Independent, unofficial connector for Google Sheets. Not affiliated with, endorsed by, or sponsored by Google Sheets. "Google Sheets" is a trademark of its owner, used only to identify the service this connector works with._

Tools for working with Google Sheets against the [Google Sheets API v4](https://developers.google.com/workspace/sheets/api/reference/rest) (`https://sheets.googleapis.com/v4/`), with spreadsheet discovery via the [Google Drive API](https://developers.google.com/drive/api/reference/rest/v3/files/list). 26 tools across two complementary surfaces: a **record surface** — rows as objects keyed by their column headers (the "log this expense", "update the status to Done", "look up last quarter's total" jobs) — and a **cell surface** — raw A1-addressed values for formulas, precise numeric/text control, and arbitrary ranges. Plus spreadsheet/worksheet structure and presentation (formatting, sorting, validation).

## When to use this

- **Read or find data inside a spreadsheet** — look up a row by a column value (`lookupRow`), find all matching rows (`findRows`), list a window of rows (`listRows`), or read a raw range (`getValues`).
- **Write data** — append a row or many rows (`createRow` / `createRows`), update specific columns of a row without disturbing the others (`updateRow` / `updateRows`), or write a raw range / formula (`updateValues`).
- **Clear or delete** — clear a row's contents but keep the row (`clearRows` / `clearValues`) or remove rows entirely (`deleteRows`).
- **Manage structure** — create a spreadsheet (`createSpreadsheet`), add / list / copy / rename / hide / delete worksheets, add columns.
- **Format & validate** — number/date/currency formats, text styling, sort a range, copy a range, dropdowns and number/date validation, conditional formatting.

## Setup

This is an [agentskills.io](https://agentskills.io) skill.

If the connector has not been installed as a skill yet, install it first with `npx skills add zapier/connectors --skill google-sheets-plg` (or your harness's own skill-install mechanism), then continue here. Installing the skill copies these files, not dependencies. Before running the CLI, a local MCP server, or `zapier-sdk` auth commands, run `npm install --omit=dev` here once. Importing the published package as a dependency in your own project instead? That `npm install` already resolves everything — see [`references/use-as-sdk.md`](references/use-as-sdk.md).

The connector runs on **Node.js 22.18+**. Pick the reference that matches how you're running it, and load it before doing anything else:

| You have...                                                                                                                                                        | Load                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| An MCP-aware client — tools may already be loaded (e.g. `mcp__google-sheets-plg__<tool>`), or you can register a local server yourself (or guide the user to)      | [`references/use-as-mcp.md`](references/use-as-mcp.md)       |
| Terminal / subprocess access (you can run `node`)                                                                                                                  | [`references/use-as-cli.md`](references/use-as-cli.md)       |
| Only your own code, importing this package as a dependency                                                                                                         | [`references/use-as-sdk.md`](references/use-as-sdk.md)       |
| No tool access, no terminal, no ability to import this package — you write your own code that calls the Google Sheets API directly (e.g. a code-execution sandbox) | [`references/use-as-recipe.md`](references/use-as-recipe.md) |

## Scripts

All scripts use the single `google-sheets-plg` connection.

| Script                                                                         | Script name                 | Connections         | Description                                                                       |
| ------------------------------------------------------------------------------ | --------------------------- | ------------------- | --------------------------------------------------------------------------------- |
| [`scripts/createSpreadsheet.ts`](scripts/createSpreadsheet.ts)                 | `createSpreadsheet`         | `google-sheets-plg` | Create a new spreadsheet, optionally with worksheets and a header row.            |
| [`scripts/getSpreadsheet.ts`](scripts/getSpreadsheet.ts)                       | `getSpreadsheet`            | `google-sheets-plg` | Get a spreadsheet's metadata and its list of worksheets.                          |
| [`scripts/listSpreadsheets.ts`](scripts/listSpreadsheets.ts)                   | `listSpreadsheets`          | `google-sheets-plg` | Find spreadsheets in Drive by name (needs Drive access; otherwise pass a URL/id). |
| [`scripts/addWorksheet.ts`](scripts/addWorksheet.ts)                           | `addWorksheet`              | `google-sheets-plg` | Add a worksheet (tab), optionally with a header row.                              |
| [`scripts/listWorksheets.ts`](scripts/listWorksheets.ts)                       | `listWorksheets`            | `google-sheets-plg` | List the worksheets (tabs) in a spreadsheet.                                      |
| [`scripts/copyWorksheet.ts`](scripts/copyWorksheet.ts)                         | `copyWorksheet`             | `google-sheets-plg` | Copy a worksheet into another spreadsheet (or the same one).                      |
| [`scripts/updateWorksheetProperties.ts`](scripts/updateWorksheetProperties.ts) | `updateWorksheetProperties` | `google-sheets-plg` | Rename, move, freeze rows/columns, hide, or recolor a worksheet.                  |
| [`scripts/deleteWorksheet.ts`](scripts/deleteWorksheet.ts)                     | `deleteWorksheet`           | `google-sheets-plg` | Permanently delete a worksheet and its data.                                      |
| [`scripts/addColumn.ts`](scripts/addColumn.ts)                                 | `addColumn`                 | `google-sheets-plg` | Insert a column, optionally with a header label.                                  |
| [`scripts/createRow.ts`](scripts/createRow.ts)                                 | `createRow`                 | `google-sheets-plg` | Append a single row, given values keyed by column header.                         |
| [`scripts/createRows.ts`](scripts/createRows.ts)                               | `createRows`                | `google-sheets-plg` | Append multiple rows in one batched call.                                         |
| [`scripts/updateRow.ts`](scripts/updateRow.ts)                                 | `updateRow`                 | `google-sheets-plg` | Update specific columns of a row by row number (leaves other columns untouched).  |
| [`scripts/updateRows.ts`](scripts/updateRows.ts)                               | `updateRows`                | `google-sheets-plg` | Update multiple rows (each by row number) in one batched call.                    |
| [`scripts/lookupRow.ts`](scripts/lookupRow.ts)                                 | `lookupRow`                 | `google-sheets-plg` | Find the first row where a column matches a value.                                |
| [`scripts/findRows.ts`](scripts/findRows.ts)                                   | `findRows`                  | `google-sheets-plg` | Find all rows matching a column/value filter (bounded).                           |
| [`scripts/listRows.ts`](scripts/listRows.ts)                                   | `listRows`                  | `google-sheets-plg` | Read a window of rows as records.                                                 |
| [`scripts/clearRows.ts`](scripts/clearRows.ts)                                 | `clearRows`                 | `google-sheets-plg` | Clear the contents of specific rows (rows stay; nothing shifts).                  |
| [`scripts/deleteRows.ts`](scripts/deleteRows.ts)                               | `deleteRows`                | `google-sheets-plg` | Delete specific rows; everything below shifts up.                                 |
| [`scripts/getValues.ts`](scripts/getValues.ts)                                 | `getValues`                 | `google-sheets-plg` | Read a raw cell range in A1 notation.                                             |
| [`scripts/updateValues.ts`](scripts/updateValues.ts)                           | `updateValues`              | `google-sheets-plg` | Write values to a raw cell range (RAW or USER_ENTERED).                           |
| [`scripts/clearValues.ts`](scripts/clearValues.ts)                             | `clearValues`               | `google-sheets-plg` | Clear the values in a raw cell range (formatting stays).                          |
| [`scripts/formatCells.ts`](scripts/formatCells.ts)                             | `formatCells`               | `google-sheets-plg` | Apply number/date/currency formatting or text styling to a range.                 |
| [`scripts/sortRange.ts`](scripts/sortRange.ts)                                 | `sortRange`                 | `google-sheets-plg` | Sort a range by one or more columns.                                              |
| [`scripts/copyRange.ts`](scripts/copyRange.ts)                                 | `copyRange`                 | `google-sheets-plg` | Copy a range (values + formatting) to another location.                           |
| [`scripts/setDataValidation.ts`](scripts/setDataValidation.ts)                 | `setDataValidation`         | `google-sheets-plg` | Set a dropdown / number / date validation rule on a range.                        |
| [`scripts/addConditionalFormatRule.ts`](scripts/addConditionalFormatRule.ts)   | `addConditionalFormatRule`  | `google-sheets-plg` | Add a conditional-formatting rule to a range.                                     |

## Auth

Every shape passes auth as one connection **selector**, not the secret — a `[<resolver>:]<value>` string. Every connector accepts `zapier:<connection-id>` (Zapier-managed auth — routes through Zapier's auth, retries, and governance layer); some also accept one or more direct-token resolvers (naming and count vary per connector) — check this connector's own resolvers rather than assuming. The `<resolver>:` prefix is optional; a bare value goes to the first resolver that claims it — a UUID-shaped bare value always claims `zapier:`. Each script declares the connections it needs and the resolvers each accepts. The exact syntax for passing a connection (and how to see this connector's resolver list) differs by shape — see the reference you loaded above.

Checking what's already configured first? Don't dump environment values to do it — `env` or `env | grep <name>` prints the value along with the name, leaking a live credential into the transcript if one is set. Check names only (`env | cut -d= -f1 | grep -i <name>`) or test a known name directly (`[ -n "$VAR_NAME" ]`).

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

## References

Load the matching reference file before working in that area:

| Reference                                                                                | Covers                                                                                                         | Load it when                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`references/google-sheets-api-gotchas.md`](references/google-sheets-api-gotchas.md)     | Error recovery, rate-limit retry, batchUpdate atomicity, row deletion and append logic, 400/403/404/429 errors | Before any call that might fail — error recovery, rate-limit retry, batchUpdate atomicity, row deletion or append logic, or when encountering 400/403/404/429 errors                            |
| [`references/google-sheets-a1-and-values.md`](references/google-sheets-a1-and-values.md) | RAW vs USER_ENTERED, serial-number dates, ragged rows, A1 ranges with sheet-name quoting                       | Before reading or writing cell values — especially when choosing RAW vs USER_ENTERED, interpreting serial-number dates, handling ragged rows, or constructing A1 ranges with sheet-name quoting |
