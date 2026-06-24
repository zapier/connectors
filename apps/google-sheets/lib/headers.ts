// Header / record model — the shared logic behind the header-keyed row tools.
// A "record" is a row mapped to an object keyed by its column-header labels (row 1).
// These helpers read the header row, map between records and positional cell arrays,
// pad ragged rows (Google omits trailing empties), and — critically — compute the
// contiguous-run write ranges that let updateRow change only named columns without
// clobbering the cells between them (see PLAN §3k).

import { columnIndexToLetter, quoteSheetName } from "./a1.ts";
import { SHEETS_BASE } from "./constants.ts";
import { googleSheetsFetch } from "./sheetsFetch.ts";

/** Read the worksheet's header row (row 1). Throws if the worksheet has no headers. */
export async function readHeaders(
  fetch: typeof globalThis.fetch,
  spreadsheetId: string,
  worksheet: string,
): Promise<string[]> {
  const range = `${quoteSheetName(worksheet)}!1:1`;
  const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const res = await googleSheetsFetch(fetch, url);
  const data = (await res.json()) as { values?: unknown[][] };
  const headers = (data.values?.[0] ?? []).map((h) => String(h ?? ""));
  if (headers.length === 0 || headers.every((h) => h === "")) {
    throw new Error(
      `Worksheet "${worksheet}" has no header row. Add column headers to row 1, or use the raw-cell tools (getValues / updateValues) instead of the record tools.`,
    );
  }
  return headers;
}

/** Resolve a worksheet title to its numeric sheetId (gid), needed by batchUpdate ops. */
export async function resolveSheetId(
  fetch: typeof globalThis.fetch,
  spreadsheetId: string,
  worksheet: string,
): Promise<number> {
  const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties(sheetId,title)`;
  const res = await googleSheetsFetch(fetch, url);
  const data = (await res.json()) as {
    sheets?: { properties: { sheetId: number; title: string } }[];
  };
  const match = data.sheets?.find((s) => s.properties.title === worksheet);
  if (!match) {
    const titles = (data.sheets ?? [])
      .map((s) => s.properties.title)
      .join(", ");
    throw new Error(
      `Worksheet "${worksheet}" not found. Available worksheets: ${titles || "(none)"}. Use listWorksheets to see the tabs.`,
    );
  }
  return match.properties.sheetId;
}

/** Map a positional row array to a header-keyed record, right-padding ragged rows. */
export function rowToRecord(
  headers: string[],
  row: unknown[],
): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, i) => {
    if (header === "") return;
    record[header] = i < row.length ? String(row[i] ?? "") : "";
  });
  return record;
}

/**
 * Map a header-keyed record to a positional cell array for an APPEND (a brand-new
 * row legitimately blank-fills columns the caller didn't name). Throws on a header
 * the worksheet doesn't have.
 */
export function recordToAppendCells(
  headers: string[],
  values: Record<string, unknown>,
): unknown[] {
  assertKnownHeaders(headers, values);
  return headers.map((h) => (h !== "" && h in values ? values[h] : ""));
}

export interface UpdateRun {
  /** A1 range for this contiguous run of named columns at the target row. */
  range: string;
  /** Single-row 2-D values payload for the run. */
  values: unknown[][];
}

/**
 * Compute the contiguous-run write ranges for a no-clobber row update (PLAN §3k).
 * Only the named columns are written; columns BETWEEN named ones are never spanned
 * with empty fillers (which would clear real data). Adjacent named columns collapse
 * into one range; gaps split into separate ranges.
 */
export function buildUpdateRuns(
  headers: string[],
  values: Record<string, unknown>,
  rowNumber: number,
  worksheet: string,
): UpdateRun[] {
  assertKnownHeaders(headers, values);
  const headerIndex = new Map<string, number>();
  headers.forEach((h, i) => {
    if (h !== "") headerIndex.set(h, i);
  });

  const named = Object.entries(values)
    .map(([key, value]) => ({ col: headerIndex.get(key)!, value }))
    .sort((a, b) => a.col - b.col);

  const runs: { startCol: number; values: unknown[] }[] = [];
  for (const { col, value } of named) {
    const last = runs[runs.length - 1];
    if (last && col === last.startCol + last.values.length) {
      last.values.push(value);
    } else {
      runs.push({ startCol: col, values: [value] });
    }
  }

  const prefix = quoteSheetName(worksheet);
  return runs.map((run) => {
    const startLetter = columnIndexToLetter(run.startCol);
    const endLetter = columnIndexToLetter(run.startCol + run.values.length - 1);
    return {
      range: `${prefix}!${startLetter}${rowNumber}:${endLetter}${rowNumber}`,
      values: [run.values],
    };
  });
}

/** Parse the 1-based row number an append landed on from `updates.updatedRange`. */
export function parseFirstRowNumber(updatedRange: string): number {
  // e.g. "'Sheet1'!A5:G5" -> 5 ; "Sheet1!A12:C13" -> 12
  const m = updatedRange.match(/![A-Z]+(\d+)/);
  if (!m)
    throw new Error(`Could not parse row number from range "${updatedRange}".`);
  return parseInt(m[1], 10);
}

function assertKnownHeaders(
  headers: string[],
  values: Record<string, unknown>,
): void {
  const valid = new Set(headers.filter((h) => h !== ""));
  const unknown = Object.keys(values).filter((k) => !valid.has(k));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown column header(s): ${unknown.join(", ")}. Valid headers: ${[...valid].join(", ")}. Header labels are case-sensitive.`,
    );
  }
}
