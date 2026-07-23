#!/usr/bin/env node
// Authored by the implementation agent: codegen only scaffolds single-HTTP-call ops;
// findRows is a match composition — it reads the header row + the worksheet's data range,
// scans rows for column/value matches (case-insensitive/trimmed, [:empty:] blank sentinel),
// and collects up to row_count records. Bounded, never auto-paginated (PLAN §3h/§1d).
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { quoteSheetName } from "../lib/a1.ts";
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
      .describe('Header label of the column to match, e.g. "Status".'),
    value: z
      .string()
      .describe(
        "Value to find (case-insensitive, trimmed). Use the literal [:empty:] to match blank cells.",
      ),
    row_count: z
      .number()
      .int()
      .positive()
      .max(500)
      .default(25)
      .describe("Max matching rows to return. Defaults to 25; max 500."),
    search_from_bottom: z
      .boolean()
      .default(false)
      .describe("Search upward from the last row (default false)."),
  })
  .strict();

const outputSchema = z.object({
  rows: z
    .array(
      z.object({
        row_number: z.number(),
        values: recordOutputSchema,
      }),
    )
    .describe("Matching rows as header-keyed records, in scan order."),
  match_count: z.number().describe("Number of matching rows returned."),
});

const definition = defineTool({
  name: "findRows",
  title: "Find Rows",
  description:
    "Find ALL rows matching a column/value filter (bounded window). Returns up to row_count records. For just the first match use lookupRow.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-sheets-plg",
  run: async (input, ctx) => {
    const spreadsheetId = normalizeSpreadsheetId(input.spreadsheet);
    const headers = await readHeaders(
      ctx.fetch,
      spreadsheetId,
      input.worksheet,
    );

    const colIdx = headers.indexOf(input.column);
    if (colIdx === -1) {
      throw new Error(
        `Unknown column header: ${input.column}. Valid headers: ${headers.filter((h) => h !== "").join(", ")}. Header labels are case-sensitive.`,
      );
    }

    // Read the whole data range (from row 2 down) and scan in memory.
    const range = `${quoteSheetName(input.worksheet)}!A2:ZZZ`;
    const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
    const res = await googleSheetsFetch(ctx.fetch, url);
    const data = (await res.json()) as { values?: unknown[][] };
    const dataRows = data.values ?? [];

    // Pair each data row with its 1-based row number (data starts at row 2).
    const indexed = dataRows.map((row, i) => ({ rowNumber: i + 2, row }));
    if (input.search_from_bottom) indexed.reverse();

    const matches: { row_number: number; values: Record<string, string> }[] =
      [];
    for (const { rowNumber, row } of indexed) {
      if (matches.length >= input.row_count) break;
      if (cellMatches(row[colIdx], input.value)) {
        matches.push({
          row_number: rowNumber,
          values: rowToRecord(headers, row),
        });
      }
    }

    return { rows: matches, match_count: matches.length };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
