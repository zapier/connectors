#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import { googleSheetsFetch } from "../lib/sheetsFetch.ts";
import { normalizeSpreadsheetId } from "../lib/spreadsheetId.ts";

const inputSchema = z
  .object({
    spreadsheet: z
      .string()
      .describe(
        "Spreadsheet id, or a full Google Sheets URL (the connector extracts the id).",
      ),
    range: z
      .string()
      .describe(
        "A1 range to clear, sheet-qualified and quoted — e.g. 'Sheet1'!A1:D10, 'Sheet1'!A:A. Always qualify the worksheet — an unqualified range targets the first visible sheet.",
      ),
  })
  .strict();
const outputSchema = z.object({
  spreadsheetId: z.string().describe("The spreadsheet id."),
  clearedRange: z.string().describe("The A1 range whose values were cleared."),
});

const definition = defineTool({
  name: "clearValues",
  title: "Clear Values",
  description:
    "Clear the values in a cell range (A1 notation). Formatting, data validation, and the cells themselves remain. To remove whole rows use deleteRows.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-sheets",
  run: async (input, ctx) => {
    const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(normalizeSpreadsheetId(input.spreadsheet))}/values/${encodeURIComponent(input.range)}:clear`;
    const res = await googleSheetsFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify({}),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
