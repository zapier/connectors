#!/usr/bin/env node
// Authored by the implementation agent: codegen only scaffolds single-HTTP-call ops;
// updateRow is a no-clobber header composition — it reads the header row, computes the
// contiguous runs of named columns (lib/headers.buildUpdateRuns), and writes only those
// runs so unnamed columns and the gaps between named ones are never blanked (PLAN §3k).
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import { buildUpdateRuns, readHeaders } from "../lib/headers.ts";
import { recordInputSchema, recordOutputSchema } from "../lib/schemas.ts";
import { googleSheetsFetch } from "../lib/sheetsFetch.ts";
import { normalizeSpreadsheetId } from "../lib/spreadsheetId.ts";

const inputSchema = z
  .object({
    spreadsheet: z
      .string()
      .describe(
        "Spreadsheet id, or a full Google Sheets URL (the connector extracts the id).",
      ),
    worksheet: z
      .string()
      .describe("Worksheet (tab) title containing the row, e.g. Sheet1."),
    row_number: z
      .number()
      .int()
      .describe(
        "1-based row number (row 1 is the header). Not stable across inserts/deletes/sorts — to target a logical record reliably, find it with lookupRow on a unique key column first.",
      ),
    values: recordInputSchema.describe(
      'Columns to update, keyed by header, e.g. {"Status":"Done"}. Only the headers you include are written; every other cell in the row — including columns between the ones you name — is left exactly as-is. To clear a specific cell, pass an explicit empty value for that header (e.g. {"Notes":""}).',
    ),
  })
  .strict();

const outputSchema = z.object({
  row_number: z.number().describe("The 1-based row number that was updated."),
  values: recordOutputSchema.describe("The column values that were written."),
  updated_cells: z.number().describe("Number of cells written."),
});

const definition = defineTool({
  name: "updateRow",
  title: "Update Row",
  description:
    "Update a single row's values (by row number), keyed by column header. Only the headers you name are written; all other cells are preserved. For many rows use updateRows.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    // Writing fixed values to a fixed row number is idempotent (re-running yields
    // the same result), matching updateValues.
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
    const runs = buildUpdateRuns(
      headers,
      input.values,
      input.row_number,
      input.worksheet,
    );

    let updatedCells = 0;
    if (runs.length === 1) {
      const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(runs[0].range)}?valueInputOption=USER_ENTERED`;
      const res = await googleSheetsFetch(ctx.fetch, url, {
        method: "PUT",
        body: JSON.stringify({ values: runs[0].values }),
      });
      const data = (await res.json()) as { updatedCells?: number };
      updatedCells = data.updatedCells ?? Object.keys(input.values).length;
    } else if (runs.length > 1) {
      const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`;
      const res = await googleSheetsFetch(ctx.fetch, url, {
        method: "POST",
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: runs.map((r) => ({ range: r.range, values: r.values })),
        }),
      });
      const data = (await res.json()) as { totalUpdatedCells?: number };
      updatedCells = data.totalUpdatedCells ?? Object.keys(input.values).length;
    }

    const writtenValues: Record<string, string> = {};
    for (const [key, value] of Object.entries(input.values)) {
      writtenValues[key] = String(value);
    }
    return {
      row_number: input.row_number,
      values: writtenValues,
      updated_cells: updatedCells,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
