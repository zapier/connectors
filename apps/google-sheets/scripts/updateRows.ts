#!/usr/bin/env node
// Authored by the implementation agent: codegen only scaffolds single-HTTP-call ops;
// updateRows is a no-clobber header composition — it reads the header row, computes the
// contiguous runs of named columns per row (lib/headers.buildUpdateRuns), flattens them
// into one values.batchUpdate so unnamed columns/gaps are never blanked (PLAN §3k).
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import { buildUpdateRuns, readHeaders } from "../lib/headers.ts";
import { recordInputSchema } from "../lib/schemas.ts";
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
      .describe("Worksheet (tab) title containing the rows, e.g. Sheet1."),
    rows: z
      .array(
        z.strictObject({
          row_number: z
            .number()
            .int()
            .describe(
              "1-based row number (row 1 is the header). Not stable across inserts/deletes/sorts — to target a logical record reliably, find it with lookupRow on a unique key column first.",
            ),
          values: recordInputSchema.describe(
            'Columns to update for this row, keyed by header, e.g. {"Status":"Done"}.',
          ),
        }),
      )
      .describe(
        'Array of { row_number, values } entries. Same no-clobber partial write as updateRow: only the named columns change, and the gaps between them are never blanked (§3k). e.g. [{"row_number":2,"values":{"Status":"Done"}},{"row_number":5,"values":{"Status":"Open"}}]. All rows are written in one batched request.',
      ),
  })
  .strict();

const outputSchema = z.object({
  updated_row_count: z.number().describe("Number of rows updated."),
  updated_cells: z.number().describe("Total number of cells written."),
});

const definition = defineTool({
  name: "updateRows",
  title: "Update Rows",
  description:
    "Update multiple rows (each by row number) in one batched call, keyed by column header. Only the headers you name per row are written; all other cells are preserved.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    // Writing fixed values to fixed row numbers is idempotent, matching updateRow/updateValues.
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

    const data = input.rows.flatMap((row) =>
      buildUpdateRuns(headers, row.values, row.row_number, input.worksheet).map(
        (r) => ({ range: r.range, values: r.values }),
      ),
    );

    let updatedCells = 0;
    if (data.length > 0) {
      const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`;
      const res = await googleSheetsFetch(ctx.fetch, url, {
        method: "POST",
        body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }),
      });
      const body = (await res.json()) as { totalUpdatedCells?: number };
      updatedCells =
        body.totalUpdatedCells ??
        input.rows.reduce((sum, r) => sum + Object.keys(r.values).length, 0);
    }

    return {
      updated_row_count: input.rows.length,
      updated_cells: updatedCells,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
