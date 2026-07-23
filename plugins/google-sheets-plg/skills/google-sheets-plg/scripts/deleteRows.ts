#!/usr/bin/env node
// Authored by the implementation agent: codegen scaffolds one HTTP call per op, but every
// structural Sheets tool POSTs the same /{id}:batchUpdate path with a different requests[]
// member — deleteRows sends one deleteDimension(ROWS) per row, sorted DESCENDING so earlier
// deletions don't shift later indices (PLAN §3g). Removes rows; everything below shifts up.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import { resolveSheetId } from "../lib/headers.ts";
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
      .array(z.number().int().positive())
      .describe(
        "1-based row numbers to delete, e.g. [5] or [3,7,9]. Rows below each deletion shift up — row numbers change. Deleting rows can re-fire downstream new/updated-row automations for every row that shifts.",
      ),
  })
  .strict();

const outputSchema = z.object({
  deleted_rows: z
    .array(z.number())
    .describe("The 1-based row numbers that were deleted."),
});

const definition = defineTool({
  name: "deleteRows",
  title: "Delete Rows",
  description:
    "Delete specific rows; everything below shifts up (row numbers change). To clear contents while keeping the rows in place, use clearRows instead.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-sheets-plg",
  run: async (input, ctx) => {
    const spreadsheetId = normalizeSpreadsheetId(input.spreadsheet);
    const sheetId = await resolveSheetId(
      ctx.fetch,
      spreadsheetId,
      input.worksheet,
    );

    // Delete bottom-up so earlier deletions don't shift the indices of later ones.
    const sorted = [...input.rows].sort((a, b) => b - a);
    const requests = sorted.map((n) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: n - 1,
          endIndex: n,
        },
      },
    }));

    const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`;
    await googleSheetsFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });

    return { deleted_rows: input.rows };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
