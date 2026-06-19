#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import { googleSheetsFetch } from "../lib/sheetsFetch.ts";
import { normalizeSpreadsheetId } from "../lib/spreadsheetId.ts";

const inputSchema = z
  .object({
    spreadsheetId: z
      .string()
      .describe(
        "Spreadsheet id (the /d/<id>/ segment of a Sheets URL). A full Sheets URL is also accepted and normalized to its id.",
      ),
    sheetId: z
      .number()
      .int()
      .describe(
        "Numeric id (gid) of the source worksheet to copy. Get it from listWorksheets (sheet_id).",
      ),
    destinationSpreadsheetId: z
      .string()
      .describe(
        "Spreadsheet id to copy the worksheet into. Can equal the source to duplicate within the same spreadsheet.",
      ),
  })
  .strict();
const outputSchema = z.object({
  sheetId: z
    .number()
    .int()
    .describe(
      "Numeric worksheet id (gid) — stable for the life of the worksheet; used where a tool needs the worksheet by id.",
    ),
  title: z.string().describe("Worksheet (tab) title."),
  index: z
    .number()
    .int()
    .describe("0-based position of the worksheet among the tabs.")
    .optional(),
  gridProperties: z
    .object({
      rowCount: z.number().int().optional(),
      columnCount: z.number().int().optional(),
    })
    .optional(),
});

const definition = defineTool({
  name: "copyWorksheet",
  title: "Copy Worksheet",
  description:
    "Copy one worksheet into another spreadsheet (or the same one). Returns the new worksheet's properties. Resolve sheetId from a worksheet title via getSpreadsheet/listWorksheets.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-sheets",
  run: async (input, ctx) => {
    const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(normalizeSpreadsheetId(input.spreadsheetId))}/sheets/${encodeURIComponent(input.sheetId)}:copyTo`;
    const body: Record<string, unknown> = {};
    if (input.destinationSpreadsheetId !== undefined)
      body["destinationSpreadsheetId"] = normalizeSpreadsheetId(
        input.destinationSpreadsheetId,
      );
    const res = await googleSheetsFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
