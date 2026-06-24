#!/usr/bin/env node
// Authored by the implementation agent: every structural Sheets tool POSTs the same
// /{id}:batchUpdate path with a different requests[] member — deleteWorksheet (a
// deleteSheet request) shares that batchUpdate path and is authored directly.
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
      .describe("Title of the worksheet (tab) to permanently delete."),
  })
  .strict();

const outputSchema = z.object({
  deleted: z
    .literal(true)
    .describe("Always true on success — the worksheet was deleted."),
  sheet_id: z.number().describe("Numeric id (gid) of the deleted worksheet."),
  title: z.string().describe("Title of the deleted worksheet."),
});

const definition = defineTool({
  name: "deleteWorksheet",
  title: "Delete Worksheet",
  description:
    "Permanently delete a worksheet (tab) and all of its data. This is irreversible. Deleting the only remaining worksheet fails — a spreadsheet must keep at least one tab.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-sheets",
  run: async (input, ctx) => {
    const spreadsheetId = normalizeSpreadsheetId(input.spreadsheet);
    const gid = await resolveSheetId(ctx.fetch, spreadsheetId, input.worksheet);

    await googleSheetsFetch(
      ctx.fetch,
      `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [{ deleteSheet: { sheetId: gid } }],
        }),
      },
    );

    return { deleted: true as const, sheet_id: gid, title: input.worksheet };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
