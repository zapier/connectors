# Google Sheets — use as a recipe

_Independent, unofficial connector for Google Sheets. Not affiliated with, endorsed by, or sponsored by Google Sheets. "Google Sheets" is a trademark of its owner, used only to identify the service this connector works with._

This reference is for a harness that has **no tool access, no terminal/subprocess, and no ability to `import` this package** — a code-execution sandbox that writes and runs its own code directly against the Google Sheets API. There's nothing here to call; instead, this teaches you the request/response mechanics behind this connector's 26 tools so you can write equivalent HTTP calls yourself: which host and path each operation family hits, what the request body looks like, what comes back, and where to look up the vendor's actual behavioral rules.

Load [`references/google-sheets-api-gotchas.md`](google-sheets-api-gotchas.md) and [`references/google-sheets-a1-and-values.md`](google-sheets-a1-and-values.md) alongside this doc — this file gives you the shapes; those two give you the rules for how Google actually behaves. Everywhere below that touches vendor behavior, this doc points into one of them rather than restating it.

## Auth & base URL

- **Sheets API v4** — base `https://sheets.googleapis.com/v4/`. Every spreadsheet/worksheet/value/formatting call below is a path under `/spreadsheets/{spreadsheetId}`.
- **Drive API v3** — base `https://www.googleapis.com/drive/v3/`. Only used for spreadsheet discovery by name (`files.list`, filtered to the Google Sheets spreadsheet MIME type) — a different host than every other operation.
- Every request carries the same bearer credential: an `Authorization: Bearer <access-token>` header with a Google OAuth 2.0 access token. Sheets calls need Sheets scope; the Drive discovery call additionally needs a Drive read scope.
- Token acquisition/refresh, scope requirements, and how to tell a scope-missing 403 apart from a file-permission 403 are vendor/account concerns, not request-shape ones — see [api-gotchas.md § Error envelope](google-sheets-api-gotchas.md#error-envelope).

## A1 notation / range addressing

Structurally, a range is `'<SheetTitle>'!<CellRef>` — a single-quoted sheet title, a `!`, then a cell/row/column reference: a single cell (`A1`), a rectangle (`A1:D10`), a whole column (`A:A`), a whole row (`1:1`), or an open-ended column/row (`A1:A`). Sheet titles are always safe to single-quote even without spaces, and an embedded apostrophe in a title is escaped by doubling it (`'Jon''s Data'!A1`).

The quoting requirement, the "unqualified range = first visible sheet" trap, and named-range precedence are vendor behavior — see [a1-and-values.md § A1 notation](google-sheets-a1-and-values.md#a1-notation), [§ Sheet-name quoting](google-sheets-a1-and-values.md#sheet-name-quoting), [§ The first-visible-sheet trap](google-sheets-a1-and-values.md#the-first-visible-sheet-trap), and [§ Named-range precedence](google-sheets-a1-and-values.md#named-range-precedence). Always build ranges with an explicit, quoted sheet title.

## Request/response shapes by operation family

Shapes below are structural (field name + type) as derived from this connector's own request/response handling. Enum member names are the field's literal allowed values (part of the schema); what each one _does_ is vendor behavior and is cited separately, not restated here.

### 1. Spreadsheet & worksheet management

**Create a spreadsheet** — `POST /spreadsheets`

```
body:     { properties: { title: <string>, locale?: <string>, timeZone?: <string> },
            sheets?: [ { properties: { title: <string> } } ] }
response: { spreadsheetId: <string>, spreadsheetUrl: <string>,
            properties?: { title?, locale?, timeZone? },
            sheets?: [ { properties: { sheetId: <number>, title: <string>, index: <number> } } ] }
```

A header row isn't part of creation — it's a separate values-write (below) to `'<firstSheetTitle>'!A1` after the create call returns.

**Get spreadsheet metadata** — `GET /spreadsheets/{spreadsheetId}`

```
query:    ?includeGridData=<bool>   (full cell data per sheet — expensive; prefer a values read)
        or ?fields=<partial-response field mask, e.g. "sheets.properties(sheetId,title,index,gridProperties)">
response: same shape as create, optionally narrowed to just the requested fields, or with full
          per-cell grid data included when includeGridData is set.
```

**Discover spreadsheets by name (Drive, not Sheets)** — `GET https://www.googleapis.com/drive/v3/files`

```
query:    ?q=<search-query string>&supportsAllDrives=true&includeItemsFromAllDrives=true
           &fields=nextPageToken,files(id,name,modifiedTime,webViewLink)&pageSize=<n>
           [&pageToken=<cursor>] [&corpora=drive&driveId=<id>]
response: { nextPageToken?: <string>, files?: [ { id, name, modifiedTime, webViewLink } ] }
```

`q` is a Drive query-language string, e.g. `mimeType='<spreadsheet-mime-type>'` optionally ANDed with `name contains '<text>'`; a literal single quote inside the search text is escaped by doubling it (Drive's own query-string escaping — not A1 sheet-name quoting, just the same doubling idea).

**Copy a worksheet into another spreadsheet** — `POST /spreadsheets/{spreadsheetId}/sheets/{sheetId}:copyTo`

```
body:     { destinationSpreadsheetId: <string> }
response: { sheetId: <number>, title: <string>, index: <number> }   (un-nested — not wrapped in `properties`)
```

The source worksheet is addressed by numeric `sheetId`, not title — resolve a title to its `sheetId` first via a metadata read.

**All other structural mutations share one endpoint** — `POST /spreadsheets/{spreadsheetId}:batchUpdate`

```
body:     { requests: [ { <requestType>: { ... } }, ... ] }
response: { replies: [ { <requestType>: { ... } }, ... ] }   (replies[i] corresponds to requests[i])
```

Validation/atomicity semantics for this endpoint are vendor behavior — see [api-gotchas.md § batchUpdate atomicity](google-sheets-api-gotchas.md#batchupdate-atomicity). The `requestType` members this connector uses:

| requestType                | Used for                                    | Shape sketch                                                                                                                            |
| -------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `addSheet`                 | add a worksheet                             | `{ properties: { title, gridProperties?: { rowCount?, columnCount? } } }` → reply carries the new `{ sheetId, title, index }`           |
| `updateSheetProperties`    | rename/move/freeze/hide/recolor a worksheet | `{ properties: { sheetId, ...changed fields }, fields: <comma-separated changed-field paths> }`                                         |
| `deleteSheet`              | delete a worksheet                          | `{ sheetId }`                                                                                                                           |
| `insertDimension`          | insert a column/row at a position           | `{ range: { sheetId, dimension: "COLUMNS"\|"ROWS", startIndex, endIndex }, inheritFromBefore: <bool> }`                                 |
| `appendDimension`          | append a column/row at the end              | `{ sheetId, dimension: "COLUMNS"\|"ROWS", length: <number> }`                                                                           |
| `deleteDimension`          | delete rows                                 | `{ range: { sheetId, dimension: "ROWS", startIndex, endIndex } }`                                                                       |
| `repeatCell`               | apply formatting to a range                 | `{ range: <GridRange>, cell: { userEnteredFormat: {...} }, fields: <field mask> }`                                                      |
| `sortRange`                | sort a range                                | `{ range: <GridRange>, sortSpecs: [ { dimensionIndex, sortOrder: "ASCENDING"\|"DESCENDING" } ] }`                                       |
| `copyPaste`                | copy/paste a range                          | `{ source: <GridRange>, destination: <GridRange>, pasteType: <enum>, pasteOrientation: "NORMAL" }`                                      |
| `setDataValidation`        | dropdown/number/date validation             | `{ range: <GridRange>, rule: { condition: { type: <enum>, values?: [{ userEnteredValue }] }, strict: <bool>, showCustomUi?: <bool> } }` |
| `addConditionalFormatRule` | conditional formatting                      | `{ rule: { ranges: [<GridRange>], booleanRule: { condition: {...}, format: {...} } }, index: <number> }`                                |

`GridRange` is `{ sheetId: <number>, startRowIndex?, endRowIndex?, startColumnIndex?, endColumnIndex?: <number> }` — 0-based, end-exclusive; build it from an A1 range plus the worksheet's resolved numeric `sheetId` (not its title). `startIndex`/`endIndex` on dimension requests use the same 0-based/end-exclusive convention.

Rows/columns are addressed by numeric `sheetId` (not title) in every `batchUpdate` request — resolve a worksheet title to its `sheetId` with a metadata read first (`GET /spreadsheets/{id}?fields=sheets.properties(sheetId,title)` or similar) and cache it for the rest of the operation.

`pasteType` values are `PASTE_NORMAL` / `PASTE_VALUES` / `PASTE_FORMAT` / `PASTE_NO_BORDERS` / `PASTE_FORMULA` / `PASTE_DATA_VALIDATION` / `PASTE_CONDITIONAL_FORMATTING` — what each copies is vendor behavior, see [api-gotchas.md § Paste types (copyPaste)](google-sheets-api-gotchas.md#paste-types-copypaste). `inheritFromBefore`'s effect is likewise vendor behavior — see [api-gotchas.md § InsertDimensionRequest inheritance](google-sheets-api-gotchas.md#insertdimensionrequest-inheritance). Row-shift consequences of `deleteDimension` are covered at [api-gotchas.md § Row numbers are not stable identifiers](google-sheets-api-gotchas.md#row-numbers-are-not-stable-identifiers) and [§ Clear vs delete semantics](google-sheets-api-gotchas.md#clear-vs-delete-semantics). The one-sheet-minimum / one-visible-sheet-minimum constraints are covered at [api-gotchas.md § Sheet constraints](google-sheets-api-gotchas.md#sheet-constraints).

Colors (`background_color`, `text_color`, `tab_color`) are sent as a Google `Color` object with 0–1 float channels: convert a `#RRGGBB` hex string by parsing each byte pair and dividing by 255 (`{ red, green, blue }`) — arithmetic, not a vendor-behavior claim.

### 2. Row/record surface (rows as header-keyed records)

This surface is a client-side composition over the raw values endpoints (family 3) — there is no single "row" endpoint on the vendor API. The pattern:

1. **Read the header row** (row 1) with a values-read (see family 3) to get the column-label → position mapping.
2. **Map a `{header: value}` record to a positional cell array** using that mapping (unknown headers rejected client-side before any request is sent).
3. Issue the actual read/write against the raw values endpoints below.

- **Append one or many rows** — a `values.append`-style call: `POST /spreadsheets/{id}/values/{range}:append?valueInputOption=<enum>&insertDataOption=<enum>`, body `{ values: [ [<cell>, ...], ... ] }` (one inner array per row, in header order). Response carries the range that was actually written, from which the landing row number(s) are parsed. Table-detection (what range/rows the append actually lands on) is vendor behavior — see [api-gotchas.md § Append table-detection](google-sheets-api-gotchas.md#append-table-detection).
- **Update specific columns of a row without touching the rest** — compute the contiguous "runs" of named header columns for the target row number(s), then write only those runs: a single-run update is `PUT /spreadsheets/{id}/values/{range}?valueInputOption=<enum>` with body `{ values: [[...]] }`; multiple runs (or multiple rows) are combined into one `POST /spreadsheets/{id}/values:batchUpdate` with body `{ valueInputOption: <enum>, data: [ { range, values }, ... ] }`. Columns you don't name, and the gaps between named columns, are never included in any written range — this is how partial-column updates avoid clobbering the rest of the row.
- **Find a row by column value** — read one column (or two, for a compound match) as a `majorDimension=COLUMNS` values-read, scan client-side for the first (or all) matching cell(s) (case-insensitive, trimmed), then read that row number's full row with a normal values-read and map it back to a header-keyed record.
- **List a window of rows** — a bounded `values.get` over `A{start}:{end}` with `majorDimension=ROWS`, mapped row-by-row into header-keyed records; paging is explicit (caller-supplied `start_row`), never automatic.
- **Clear specific rows' contents (rows stay in place)** — `POST /spreadsheets/{id}/values:batchClear`, body `{ ranges: [ "'<Sheet>'!<row>:<row>", ... ] }` — one whole-row A1 range per row number. See [api-gotchas.md § Clear vs delete semantics](google-sheets-api-gotchas.md#clear-vs-delete-semantics).
- **Delete specific rows (rows shift up)** — one `deleteDimension` request per row inside a single `batchUpdate` call (family 1), each `{ range: { sheetId, dimension: "ROWS", startIndex, endIndex } }`; issue them in descending row-index order so an earlier deletion doesn't shift the index of a later target.

Every read in this family returns a 2-D `values` array with the ragged-row behavior described at [a1-and-values.md § Ragged rows](google-sheets-a1-and-values.md#ragged-rows--trailing-empties-are-omitted) — right-pad rows to the expected header width before indexing into them by column position. Row numbers found this way are only valid until the next structural change — see [api-gotchas.md § Row numbers are not stable identifiers](google-sheets-api-gotchas.md#row-numbers-are-not-stable-identifiers).

### 3. Raw values surface (cells, not records)

- **Read a range** — `GET /spreadsheets/{id}/values/{range}?majorDimension=<ROWS|COLUMNS>&valueRenderOption=<enum>&dateTimeRenderOption=<enum>` → `{ range, majorDimension, values: [[<cell>, ...], ...] }`.
- **Write a range** — `PUT /spreadsheets/{id}/values/{range}?valueInputOption=<enum>&includeValuesInResponse=<bool>`, body `{ range, majorDimension, values: [[<cell>, ...], ...] }` → `{ spreadsheetId, updatedRange, updatedRows?, updatedColumns?, updatedCells? }`.
- **Clear a range's values** — `POST /spreadsheets/{id}/values/{range}:clear`, empty body `{}` → `{ spreadsheetId, clearedRange }`.

`valueInputOption` (`RAW` / `USER_ENTERED`) and `valueRenderOption` (`FORMATTED_VALUE` / `UNFORMATTED_VALUE` / `FORMULA`) and `dateTimeRenderOption` (`SERIAL_NUMBER` / `FORMATTED_STRING`) are the field's literal allowed values — what each one does to parsing/rendering is vendor behavior, see [a1-and-values.md § valueInputOption](google-sheets-a1-and-values.md#valueinputoption--how-writes-are-interpreted), [§ valueRenderOption](google-sheets-a1-and-values.md#valuerenderoption--how-reads-are-formatted), and [§ dateTimeRenderOption](google-sheets-a1-and-values.md#datetimerenderoption--serial-numbers-vs-strings).

## Error-handling pattern

Every call above returns a normal HTTP status. Treat any non-2xx as an error and parse the JSON body — Google's error responses share one envelope shape (`{ error: { code, message, status } }`); the meaning of each `status`/`code` combination and the recommended recovery per code (bad range, missing scope vs. missing file permission, not-found, rate limit) is vendor behavior — see [api-gotchas.md § Error envelope](google-sheets-api-gotchas.md#error-envelope) for the full table before you write your own retry/recovery branches.

For 429s specifically, apply backoff before retrying rather than retrying immediately — the wait strategy and the per-minute quota shape are vendor behavior, see [api-gotchas.md § Rate limits](google-sheets-api-gotchas.md#rate-limits).

## Critical rules

These are all vendor-behavior facts, not request shapes — don't restate them from memory, follow the link and re-read before relying on the behavior:

- Range addressing pitfalls (quoting, the first-visible-sheet trap, named-range precedence) — [a1-and-values.md § A1 notation](google-sheets-a1-and-values.md#a1-notation) and its sub-sections.
- Write parsing (`RAW` vs `USER_ENTERED`) and read formatting/date rendering — [a1-and-values.md § valueInputOption](google-sheets-a1-and-values.md#valueinputoption--how-writes-are-interpreted), [§ valueRenderOption](google-sheets-a1-and-values.md#valuerenderoption--how-reads-are-formatted), [§ dateTimeRenderOption](google-sheets-a1-and-values.md#datetimerenderoption--serial-numbers-vs-strings).
- Ragged rows on read — [a1-and-values.md § Ragged rows](google-sheets-a1-and-values.md#ragged-rows--trailing-empties-are-omitted).
- Number format pattern tokens — [a1-and-values.md § Number format patterns](google-sheets-a1-and-values.md#number-format-patterns).
- Error envelope and per-status recovery, rate limits and backoff, hard limits (cell/column/character caps) — [api-gotchas.md § Error envelope](google-sheets-api-gotchas.md#error-envelope), [§ Rate limits](google-sheets-api-gotchas.md#rate-limits), [§ Hard limits](google-sheets-api-gotchas.md#hard-limits).
- `batchUpdate` validate-then-apply atomicity — [api-gotchas.md § batchUpdate atomicity](google-sheets-api-gotchas.md#batchupdate-atomicity).
- Row-number instability and delete-vs-clear semantics — [api-gotchas.md § Row numbers are not stable identifiers](google-sheets-api-gotchas.md#row-numbers-are-not-stable-identifiers), [§ Clear vs delete semantics](google-sheets-api-gotchas.md#clear-vs-delete-semantics).
- Append table-detection — [api-gotchas.md § Append table-detection](google-sheets-api-gotchas.md#append-table-detection).
- Sheet/worksheet constraints (unique titles, sheetId assignment, one-sheet minimum) — [api-gotchas.md § Sheet constraints](google-sheets-api-gotchas.md#sheet-constraints).
- Paste-type semantics and destination-size behavior — [api-gotchas.md § Paste types (copyPaste)](google-sheets-api-gotchas.md#paste-types-copypaste).
- `insertDimension` formatting inheritance — [api-gotchas.md § InsertDimensionRequest inheritance](google-sheets-api-gotchas.md#insertdimensionrequest-inheritance).

Also carry over the disambiguation and confirmation discipline from [`SKILL.md`](../SKILL.md) even though you have no tool layer enforcing it for you: before writing to a row or spreadsheet you found by matching a value, count exact matches yourself (act on exactly one, stop and ask on a tie), and confirm with the user before any destructive or bulk-overwrite call (deleting a worksheet or rows, clearing values, overwriting a range).

## Where to go next

- [`references/google-sheets-api-gotchas.md`](google-sheets-api-gotchas.md) — error recovery, rate limits, `batchUpdate` atomicity, row deletion/append semantics, sheet constraints, paste types, dimension-insert inheritance. Start at [§ Error envelope](google-sheets-api-gotchas.md#error-envelope).
- [`references/google-sheets-a1-and-values.md`](google-sheets-a1-and-values.md) — A1 addressing, `RAW`/`USER_ENTERED`, render options, ragged rows, number formats. Start at [§ A1 notation](google-sheets-a1-and-values.md#a1-notation).
- [`SKILL.md`](../SKILL.md) — the tool catalog, disambiguation/refusal rules, and what this connector deliberately does not support (charts, pivot tables, named/protected ranges, filters, find-or-create, whole-spreadsheet delete).
