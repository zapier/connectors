# google-sheets A1 notation & cell values

How A1 ranges, value input/output options, and date serialization work in the Google Sheets API v4. Every claim cites a public source; see `references-provenance.json` in the blueprints repo for the fetched spans.

---

## A1 notation

A1 notation identifies cells, ranges, rows, and columns. Examples: `A1`, `A1:B2`, `A:A` (whole column), `1:1` (whole row), `A1:A` (column A from row 1 down).
([Concepts guide — A1 notation](https://developers.google.com/workspace/sheets/api/guides/concepts#expandable-1))

### Sheet-name quoting

"Single quotes are required for sheet names with spaces or special characters." Always-quoting is safe — `'Sheet1'!A1:B2` works even when the name has no spaces.

To embed a literal apostrophe in a quoted sheet name, double it: a sheet named `Jon's Data` becomes `'Jon''s Data'!A1:B2`.
([Concepts guide — A1 notation](https://developers.google.com/workspace/sheets/api/guides/concepts#expandable-1))

### The first-visible-sheet trap

An **unqualified** range (no sheet name prefix) targets the first visible sheet:

> "`A1:B2` refers to all the cells in the first two rows and columns of the first visible sheet."

This is a common source of 400s or silent wrong-sheet writes when a spreadsheet has multiple tabs. Always qualify ranges with the sheet name.
([Concepts guide — A1 notation](https://developers.google.com/workspace/sheets/api/guides/concepts#expandable-1))

### Named-range precedence

If a named range has the same label as a sheet name (e.g. both a sheet and a named range called `Sheet1`), the named range takes precedence in an A1 reference. Quote the sheet name to disambiguate.
([Concepts guide — A1 notation](https://developers.google.com/workspace/sheets/api/guides/concepts#expandable-1))

---

## valueInputOption — how writes are interpreted

Every write method (`values.update`, `values.append`, `values.batchUpdate`) requires a `valueInputOption` that controls how input strings are parsed ([ValueInputOption reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/ValueInputOption), [values guide](https://developers.google.com/workspace/sheets/api/guides/values)):

### RAW

"The values the user has entered will not be parsed and will be stored as-is."

- All string values are stored literally — `"=SUM(A1:A5)"` becomes the text `=SUM(A1:A5)`, not a formula.
- Strings that look like numbers are stored as text (left-aligned in the UI). A value like `"007"` keeps its leading zeros.
- Non-string values (booleans, numbers) passed via the JSON body are stored as their JSON type.

Use RAW for IDs, ZIP codes, phone numbers, and any value where exact string preservation matters.

### USER_ENTERED

"The values will be parsed as if the user typed them into the UI. Numbers will stay as numbers, but strings may be converted to numbers, dates, etc. following the same rules that are applied when entering text into a cell via the Google Sheets UI."

- `"=1+2"` is evaluated as a formula → the cell shows `3`.
- `"Mar 1 2016"` is parsed as a date.
- `"$100.15"` becomes a number with currency formatting.
- `"007"` is parsed as the number `7` — **leading zeros are stripped**.
- `"TRUE"` / `"FALSE"` become booleans.

Use USER_ENTERED when the input should behave like manual cell entry (formulas, dates, formatted numbers).
([Values guide](https://developers.google.com/workspace/sheets/api/guides/values), [ValueInputOption reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/ValueInputOption))

---

## valueRenderOption — how reads are formatted

Every read method (`values.get`, `values.batchGet`) accepts a `valueRenderOption` that controls the output representation. Default is `FORMATTED_VALUE`.
([ValueRenderOption reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/ValueRenderOption))

| Option              | Returns                                                      | Example (cell = 1.23 formatted as currency) |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| `FORMATTED_VALUE`   | Display string with formatting applied                       | `"$1.23"`                                   |
| `UNFORMATTED_VALUE` | Calculated value without formatting (full numeric precision) | `1.23`                                      |
| `FORMULA`           | The underlying formula text, not the computed result         | `"=A1*1.23"`                                |

---

## dateTimeRenderOption — serial numbers vs strings

Controls how date/time/duration values appear in read responses. Default is `SERIAL_NUMBER`. **Only takes effect when `valueRenderOption` is not `FORMATTED_VALUE`** — "you should only use dateTimeRenderOption if the valueRenderOption isn't FORMATTED_VALUE."
([Values guide](https://developers.google.com/workspace/sheets/api/guides/values), [DateTimeRenderOption reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/DateTimeRenderOption))

### SERIAL_NUMBER (default)

Dates are returned as doubles in the "serial number" format "popularized by Lotus 1-2-3." The **epoch is December 30, 1899**:

- January 1, 1900 at noon = `2.5` (2 days after epoch + 0.5 for half a day).
- February 1, 1900 at 3 PM = `33.625`.
- The year 1900 is correctly treated as a non-leap year.

The whole-number part is days since 1899-12-30; the fractional part is the time-of-day as a fraction of 24 hours.

### FORMATTED_STRING

Dates are returned as strings "formatted according to their assigned number format, which depends on the spreadsheet's locale settings." A cell formatted as `yyyy-mm-dd` returns e.g. `"2026-06-18"`.

---

## Ragged rows — trailing empties are omitted

"Empty trailing rows and columns are omitted." from `values.get` / `values.batchGet` responses. This means:

- Rows at the bottom of the requested range that are entirely empty are not returned.
- Within a row, trailing empty cells are dropped — so rows in the response may have **different lengths**.
- A row `["Alice", "", ""]` comes back as `["Alice"]` if the last two cells are empty.

Consumers must right-pad rows to the expected column count when building records.
([Values guide](https://developers.google.com/workspace/sheets/api/guides/values))

---

## Number format patterns

Format patterns use the tokens `0` (digit, shows insignificant zeros), `#` (digit, hides insignificant zeros), and `?` (digit, shows insignificant zeros as spaces). Up to four sections separated by `;`: `[positive];[negative];[zero];[text]`.

Rendering depends on the spreadsheet's locale. The TEXT number-format type stores cell content as a literal string, preserving leading zeros and preventing numeric parsing.
([Number and date format guide](https://developers.google.com/workspace/sheets/api/guides/formats))
