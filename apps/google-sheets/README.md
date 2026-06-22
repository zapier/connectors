# @zapier/google-sheets-connector

_Independent, unofficial connector for Google Sheets. Not affiliated with, endorsed by, or sponsored by Google Sheets. "Google Sheets" is a trademark of its owner, used only to identify the service this connector works with._

Agent-callable Google Sheets tools that operate on the data _inside_ a spreadsheet. It wraps the [Google Sheets API v4](https://developers.google.com/workspace/sheets/api/reference/rest) (with spreadsheet discovery via the [Google Drive API](https://developers.google.com/drive/api/reference/rest/v3/files/list)) and exposes two surfaces: a **record surface** — rows as objects keyed by their column headers, for "log this row", "update the status", "look up the customer" jobs — and a **cell surface** — raw A1-addressed values for formulas, precise numeric/text control, and arbitrary ranges. It also manages spreadsheet/worksheet structure and presentation (formatting, sorting, validation). Auth is Google OAuth 2.0 — recommended via a Zapier-managed connection (which also handles token refresh).

This connector is the same artifact across four shapes: MCP server, CLI bin, importable Node module, and an [Agent Skill](https://agentskills.io/) anchored by [`SKILL.md`](SKILL.md). Pick the shape that matches how your agent runs.

## Install

```bash
# Run a tool with zero install — npx fetches the package on first use
GOOGLE_SHEETS_ACCESS_TOKEN=ya29.xxx npx @zapier/google-sheets-connector run <toolName> '{ ... }' --connection env:GOOGLE_SHEETS_ACCESS_TOKEN

# Install as a dependency to import the tools in your own code
npm install @zapier/google-sheets-connector

# Or install as an Agent Skill (https://agentskills.io)
npx skills zapier/connectors --skill google-sheets
```

Credentials are passed as a `--connection [<resolver>:]<value>` selector (the value is an env-var name or a connection id, never the secret). Use `--connection zapier:<connection-id>` to route through Zapier-managed auth (recommended; no third-party secret enters the agent's environment, and token refresh is handled for you); see [`SKILL.md`](SKILL.md#auth) for tradeoffs and how to find a connection ID.

## Tools

Run `npx @zapier/google-sheets-connector run <toolName> --help` to see any tool's exact input contract + which auth env vars are set.

**Rows — records (header-keyed)**

| Tool         | Description                                                             |
| ------------ | ----------------------------------------------------------------------- |
| `createRow`  | Append a single row, given values keyed by column header.               |
| `createRows` | Append multiple rows in one batched call.                               |
| `updateRow`  | Update specific columns of a row by row number (other cells preserved). |
| `updateRows` | Update multiple rows (each by row number) in one batched call.          |
| `lookupRow`  | Find the first row where a column matches a value.                      |
| `findRows`   | Find all rows matching a column/value filter (bounded).                 |
| `listRows`   | Read a window of rows as records.                                       |
| `clearRows`  | Clear the contents of specific rows (rows stay).                        |
| `deleteRows` | Delete specific rows; everything below shifts up.                       |

**Cells — raw A1 values**

| Tool           | Description                                              |
| -------------- | -------------------------------------------------------- |
| `getValues`    | Read a raw cell range in A1 notation.                    |
| `updateValues` | Write values to a raw cell range (RAW or USER_ENTERED).  |
| `clearValues`  | Clear the values in a raw cell range (formatting stays). |

**Spreadsheets & worksheets**

| Tool                        | Description                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| `createSpreadsheet`         | Create a new spreadsheet, optionally with worksheets and a header row. |
| `getSpreadsheet`            | Get a spreadsheet's metadata and worksheet list.                       |
| `listSpreadsheets`          | Find spreadsheets in Drive by name.                                    |
| `addWorksheet`              | Add a worksheet (tab), optionally with a header row.                   |
| `listWorksheets`            | List the worksheets in a spreadsheet.                                  |
| `copyWorksheet`             | Copy a worksheet into another spreadsheet.                             |
| `updateWorksheetProperties` | Rename, move, freeze, hide, or recolor a worksheet.                    |
| `deleteWorksheet`           | Permanently delete a worksheet and its data.                           |
| `addColumn`                 | Insert a column, optionally with a header label.                       |

**Formatting & ranges**

| Tool                       | Description                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| `formatCells`              | Apply number/date/currency formatting or text styling to a range. |
| `sortRange`                | Sort a range by one or more columns.                              |
| `copyRange`                | Copy a range (values + formatting) to another location.           |
| `setDataValidation`        | Set a dropdown / number / date validation rule on a range.        |
| `addConditionalFormatRule` | Add a conditional-formatting rule to a range.                     |

## Usage

```ts
import { lookupRow } from "@zapier/google-sheets-connector";

// Each named export is the consumer-facing (input, opts) => Promise<{ data, meta }>.
const { data } = await lookupRow(
  {
    spreadsheet: "https://docs.google.com/spreadsheets/d/1AbC.../edit",
    worksheet: "Sheet1",
    column: "Email",
    value: "sam@example.com",
  },
  { connection: "zapier:<connection-id>" }, // or "env:GOOGLE_SHEETS_ACCESS_TOKEN"
);
// data => { found: true, row_number: 12, values: { Name: "Sam", Email: "sam@example.com", ... } }
```

Every tool returns a `{ data, meta }` envelope; `meta.outputValidation` reports what output validation did. Pass `{ skipOutputValidation: true }` (SDK) / `--skipOutputValidation` (CLI) / `meta: { skipOutputValidation: true }` (MCP) for the raw, unvalidated result. See [`SKILL.md`](SKILL.md#output-format).

## MCP Server

Add one stanza to any MCP-aware client (Claude Desktop, Cursor, Claude Code, …) to auto-discover the tools over stdio:

<!-- prettier-ignore -->
```jsonc
// e.g. claude_desktop_config.json or .cursor/mcp.json
{
  "mcpServers": {
    "google-sheets": {
      "command": "npx",
      "args": ["@zapier/google-sheets-connector", "mcp"],
      "env": {
        "GOOGLE_SHEETS_ZAPIER_CONNECTION_ID": "<connection-id>"
      }
    }
  }
}
```

Swap `GOOGLE_SHEETS_ZAPIER_CONNECTION_ID` for `GOOGLE_SHEETS_ACCESS_TOKEN` if you don't have a Zapier account (a Google OAuth access token; note Google tokens expire ~1 hour after issue and aren't auto-refreshed in this mode).

## When to use this

- An agent needs to **read, search, or write data inside a Google spreadsheet** — append/update rows, look up a record by a column value, read or write specific cells or ranges, or pull a window of rows.
- An agent needs to **manage spreadsheet structure** — create a spreadsheet, add/copy/rename/delete worksheets, add columns — or apply **formatting, sorting, and validation**.

## When NOT to use this

- **File-level Drive operations** (move, share, set permissions, trash a whole spreadsheet) — use a Google Drive tool; this connector operates on spreadsheet _contents_, not the file.
- **Charts, pivot tables, named/protected ranges, or filters** — not exposed by this connector.
- **Event triggers** ("when a new row is added…") — connectors are non-trigger; use a Zapier trigger for change detection.

## Links

- [`SKILL.md`](SKILL.md) — runtime guidance for agents
- [Google Sheets API reference](https://developers.google.com/workspace/sheets/api/reference/rest)
- [Source](https://github.com/zapier/connectors/tree/main/apps/google-sheets)

## Legal

**Scope of license.** Zapier licenses only the connector code in this package. Zapier grants no rights in Google Sheets's API, services, data, schemas, documentation, or other materials, which remain the property of Google Sheets. Your use of Google Sheets's API is governed by your own agreement with Google Sheets.

**Trademarks and affiliation.** Google Sheets and its logos are trademarks of their owner, used here only to identify the service this connector works with. This connector is not affiliated with, endorsed by, or sponsored by Google Sheets.

**Your responsibility.** This connector calls Google Sheets's API using credentials you supply. You are responsible for holding a valid Google Sheets account, for complying with Google Sheets's API terms, developer policies, and acceptable use rules, and for the data you send and receive through it.

**No warranty.** This connector is provided "as is," without warranty of any kind, and is not an official Google Sheets product. Zapier is not responsible for changes Google Sheets makes to its API or for any consequence of your use of Google Sheets's API. See the repository LICENSE for the full disclaimer.

**Forks.** You may fork and modify this connector under the Elastic License 2.0. You may state that your fork is "based on" Zapier's connector, but you may not use the "Zapier" name or logo as the name or branding of your fork, or in any way that suggests Zapier produces, endorses, or supports it.

Licensed under the Elastic License 2.0. See the repository LICENSE and NOTICE.
