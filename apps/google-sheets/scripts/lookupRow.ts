#!/usr/bin/env node
// Authored by the implementation agent: codegen only scaffolds single-HTTP-call ops;
// lookupRow is a match composition — it reads the header row + the match column(s) as a
// COLUMNS read, finds the first matching row index (case-insensitive/trimmed, with the
// [:empty:] blank sentinel), then reads that full row and maps it to a header record.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { columnIndexToLetter, quoteSheetName } from "../lib/a1.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import { readHeaders, rowToRecord } from "../lib/headers.ts";
import { recordOutputSchema } from "../lib/schemas.ts";
import { googleSheetsFetch } from "../lib/sheetsFetch.ts";
import { normalizeSpreadsheetId } from "../lib/spreadsheetId.ts";

const EMPTY_SENTINEL = "[:empty:]";

function cellMatches(cell: unknown, target: string): boolean {
  const cellStr = String(cell ?? "").trim();
  if (target === EMPTY_SENTINEL) return cellStr === "";
  return cellStr.toLowerCase() === target.trim().toLowerCase();
}

/** Read a single column (by header label) as a COLUMNS read. Returns the column's cells. */
async function readColumn(
  fetch: typeof globalThis.fetch,
  spreadsheetId: string,
  worksheet: string,
  headers: string[],
  column: string,
): Promise<unknown[]> {
  const idx = headers.indexOf(column);
  if (idx === -1) {
    throw new Error(
      `Unknown column header: ${column}. Valid headers: ${headers.filter((h) => h !== "").join(", ")}. Header labels are case-sensitive.`,
    );
  }
  const letter = columnIndexToLetter(idx);
  const range = `${quoteSheetName(worksheet)}!${letter}:${letter}`;
  const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=COLUMNS&valueRenderOption=FORMATTED_VALUE`;
  const res = await googleSheetsFetch(fetch, url);
  const data = (await res.json()) as { values?: unknown[][] };
  return data.values?.[0] ?? [];
}

const inputSchema = z
  .object({
    spreadsheet: z
      .string()
      .describe(
        "Spreadsheet id, or a full Google Sheets URL (the connector extracts the id).",
      ),
    worksheet: z
      .string()
      .describe("Worksheet (tab) title to search, e.g. Sheet1."),
    column: z
      .string()
      .describe('Header label of the column to match, e.g. "Email".'),
    value: z
      .string()
      .describe(
        "Value to find (case-insensitive, trimmed). Use the literal [:empty:] to match blank cells.",
      ),
    second_column: z
      .string()
      .optional()
      .describe(
        "Optional additional column header to match — the row must match both columns.",
      ),
    second_value: z
      .string()
      .optional()
      .describe(
        "Value to match for second_column (case-insensitive, trimmed).",
      ),
    search_from_bottom: z
      .boolean()
      .default(false)
      .describe("Search upward from the last row (default false)."),
  })
  .strict();

const outputSchema = z.object({
  found: z.boolean().describe("Whether a matching row was found."),
  row_number: z
    .number()
    .nullable()
    .describe("1-based row number of the first match, or null if not found."),
  values: recordOutputSchema
    .nullable()
    .describe(
      "The matching row as a header-keyed record, or null if not found.",
    ),
});

const definition = defineTool({
  name: "lookupRow",
  title: "Lookup Row",
  description:
    "Find the FIRST row where a column matches a value; returns the record + its row number. The durable way to target a logical record across runs. Returns found:false on no match (not an error). For all matches use findRows.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-sheets",
  run: async (input, ctx) => {
    const spreadsheetId = normalizeSpreadsheetId(input.spreadsheet);
    const headers = await readHeaders(
      ctx.fetch,
      spreadsheetId,
      input.worksheet,
    );

    const primary = await readColumn(
      ctx.fetch,
      spreadsheetId,
      input.worksheet,
      headers,
      input.column,
    );
    const secondary =
      input.second_column !== undefined
        ? await readColumn(
            ctx.fetch,
            spreadsheetId,
            input.worksheet,
            headers,
            input.second_column,
          )
        : null;

    // Build candidate data-row indices (1-based), skipping the header row (row 1).
    const lastRow = Math.max(primary.length, secondary ? secondary.length : 0);
    const rowNumbers: number[] = [];
    for (let r = 2; r <= lastRow; r++) rowNumbers.push(r);
    if (input.search_from_bottom) rowNumbers.reverse();

    let matchRow: number | null = null;
    for (const rowNum of rowNumbers) {
      const i = rowNum - 1; // 0-based index into the column arrays
      if (!cellMatches(primary[i], input.value)) continue;
      if (secondary && input.second_value !== undefined) {
        if (!cellMatches(secondary[i], input.second_value)) continue;
      }
      matchRow = rowNum;
      break;
    }

    if (matchRow === null) {
      return { found: false, row_number: null, values: null };
    }

    const rowRange = `${quoteSheetName(input.worksheet)}!${matchRow}:${matchRow}`;
    const rowUrl = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(rowRange)}?valueRenderOption=FORMATTED_VALUE`;
    const res = await googleSheetsFetch(ctx.fetch, rowUrl);
    const data = (await res.json()) as { values?: unknown[][] };
    const row = data.values?.[0] ?? [];
    return {
      found: true,
      row_number: matchRow,
      values: rowToRecord(headers, row),
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
