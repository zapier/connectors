# google-sheets API gotchas

Behavioral quirks, limits, and recovery patterns for the Google Sheets API v4 and the Google Drive API v3 (spreadsheet discovery). Every claim cites a public source; see `references-provenance.json` in the blueprints repo for the fetched spans.

---

## Error envelope

Google returns errors as `{ error: { code, message, status } }`. The `status` field is a gRPC-style string (`INVALID_ARGUMENT`, `NOT_FOUND`, `PERMISSION_DENIED`, etc.) and the `message` is free-text. Key status codes and recovery:

| Code                                                           | Typical cause                                                                                                        | Recovery                                                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **400** `INVALID_ARGUMENT`                                     | Bad or unquoted A1 range, malformed request body, out-of-bounds index.                                               | Fix the range (single-quote the sheet name, confirm the worksheet exists).                   |
| **403** `PERMISSION_DENIED`                                    | The connected account lacks edit access to the file.                                                                 | Share the spreadsheet with the account, or request edit access from the owner.               |
| **403** insufficient scope / `ACCESS_TOKEN_SCOPE_INSUFFICIENT` | The OAuth token doesn't include the required scope (e.g. `spreadsheets` or `drive.readonly` for `listSpreadsheets`). | Reconnect with the correct scopes — this is an auth-config issue, not a per-file permission. |
| **404** `NOT_FOUND`                                            | Spreadsheet ID doesn't exist, or the worksheet title is wrong.                                                       | Verify the spreadsheet ID (or URL) and the worksheet title with `listWorksheets`.            |
| **429** `RESOURCE_EXHAUSTED`                                   | Per-user or per-project rate limit exceeded (see § Rate limits).                                                     | Back off with exponential delay and retry.                                                   |

The 403 split matters: a **scope** 403 means the token is missing a required OAuth scope (reconnect); a **permission** 403 means the file isn't shared with the account (share it). The `message` and `status` fields distinguish them — look for "insufficient" / "scope" / `ACCESS_TOKEN_SCOPE_INSUFFICIENT` to identify the scope variant.
([Sheets API error responses](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get), [OAuth scopes](https://developers.google.com/identity/protocols/oauth2/scopes#sheets))

---

## Rate limits

The Sheets API enforces per-minute quotas that refill every minute ([usage limits](https://developers.google.com/workspace/sheets/api/limits)):

| Quota                                          | Limit |
| ---------------------------------------------- | ----- |
| Read requests per project per minute           | 300   |
| Read requests per user per project per minute  | 60    |
| Write requests per project per minute          | 300   |
| Write requests per user per project per minute | 60    |

The **per-project** pool is shared across all users of the same OAuth client / API key. When the pool is exhausted, even a user under their individual 60 req/min cap receives 429s.

On 429, use **truncated exponential backoff**: wait `min(2^n + random_ms, max_backoff)` seconds per retry, with 0–1 000 ms of jitter to break synchronized retry waves. No daily request limit exists — only the per-minute quotas apply.
([Usage limits](https://developers.google.com/workspace/sheets/api/limits))

Additional per-request constraints:

- 180-second maximum processing time per request.
- 2 MB recommended maximum request payload.
  ([Usage limits](https://developers.google.com/workspace/sheets/api/limits))

---

## Hard limits

| Limit                 | Value                                               | Source                                                                                |
| --------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Cells per spreadsheet | 10 000 000                                          | [Google Drive Help — file size limits](https://support.google.com/drive/answer/37603) |
| Maximum columns       | 18 278 (column ZZZ)                                 | [Google Drive Help — file size limits](https://support.google.com/drive/answer/37603) |
| Characters per cell   | 50 000 (cells exceeding this are removed on import) | [Google Drive Help — file size limits](https://support.google.com/drive/answer/37603) |

The 10 M-cell cap is an **or** with the 18 278-column cap — whichever is hit first. Row count is not independently capped; it's derived from `10 000 000 / column_count`.

---

## batchUpdate atomicity

`spreadsheets:batchUpdate` validates every request in the array before applying any. "If any request is not valid then the entire request will fail and nothing will be applied." Requests within a valid batch are applied atomically and in order; the response array mirrors the request array 1:1.
([batchUpdate reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate))

---

## Row numbers are not stable identifiers

Row numbers shift whenever rows are inserted, deleted, or sorted. A row at position 5 today may be at position 3 tomorrow after two rows above it are deleted. To target the same logical record across operations, match on a unique key column (via `lookupRow`) rather than remembering a row number.

Deleting rows via `deleteDimension(ROWS)` shifts everything below the deleted range upward — this is standard spreadsheet behavior and is documented in the [DeleteDimensionRequest reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDimensionRequest).

---

## Clear vs delete semantics

- **`values:clear`** removes only cell values — "all other properties of the cell (such as formatting, data validation, etc..) are kept." Rows stay in place; nothing shifts.
  ([values.clear reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/clear))
- **`deleteDimension(ROWS)`** removes entire rows and shifts everything below upward. Row numbers for all rows beneath the deletion change.
  ([DeleteDimensionRequest reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#DeleteDimensionRequest))

---

## Append table-detection

`values:append` "searches for existing data and finds a 'table' within that range" and appends after the last row of that table. The range you pass is a search hint, not the write target — the API finds the table boundary automatically.

Examples from the docs (given tables at A1:C2 and B4:D6):

- `Sheet1`, `B4`, `C5:D5`, `B2:D4`, `A3:G10` → all append after B4:D6 (the last table in the matched range).
- `A1` → appends after A1:C2 (the table containing A1).
- `E4` → starts a new table at E4 (outside any existing table).

The response's `tableRange` field is empty if no table was found.

**`insertDataOption`**: by default append overwrites existing data after the table. Set `insertDataOption=INSERT_ROWS` to insert new rows instead — "Rows are inserted for the new data."
([values.append reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append), [values guide](https://developers.google.com/workspace/sheets/api/guides/values))

---

## Sheet constraints

- **sheetId** is a numeric identifier auto-assigned by Google. When creating a sheet via `AddSheetRequest`, "if one is not set, an id will be randomly generated. (It is an error to specify the ID of a sheet that already exists.)" Retrieve it with `spreadsheets.get`.
  ([AddSheetRequest reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#AddSheetRequest))
- **Duplicate titles**: attempting to add a worksheet with a title that already exists in the spreadsheet fails. Worksheet titles must be unique within a spreadsheet.
- **Last-sheet guard**: a spreadsheet must have at least one sheet. Attempting to delete the only remaining sheet fails. In practice, attempting to hide the only visible sheet also fails — at least one sheet must remain visible.

---

## Paste types (copyPaste)

The `CopyPasteRequest` supports these paste modes ([CopyPasteRequest reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#CopyPasteRequest)):

| pasteType                      | What it copies                                                |
| ------------------------------ | ------------------------------------------------------------- |
| `PASTE_NORMAL`                 | "Paste values, formulas, formats, and merges."                |
| `PASTE_VALUES`                 | "Paste the values ONLY without formats, formulas, or merges." |
| `PASTE_FORMAT`                 | "Paste the format only, excluding data validation."           |
| `PASTE_NO_BORDERS`             | "Like PASTE_NORMAL but without borders."                      |
| `PASTE_FORMULA`                | "Paste the formulas only."                                    |
| `PASTE_DATA_VALIDATION`        | "Paste the data validation only."                             |
| `PASTE_CONDITIONAL_FORMATTING` | "Paste the conditional formatting rules only."                |

If the destination range is smaller than the source, "the entire source data will still be copied (beyond the end of the destination range)." If it's a multiple of the source size, the data repeats to fill.

---

## InsertDimensionRequest inheritance

When inserting rows or columns, `inheritFromBefore` controls which adjacent dimension's formatting applies to the new rows/columns. When `true`, the new rows inherit from the row above the insertion point (requires `startIndex > 0`); when `false`, they inherit from the row below.
([InsertDimensionRequest reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#InsertDimensionRequest))
