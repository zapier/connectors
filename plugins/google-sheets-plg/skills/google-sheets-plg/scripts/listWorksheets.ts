#!/usr/bin/env node
// Authored by the implementation agent: shares getSpreadsheet's GET path with a
// narrow fields mask (sheets.properties) — codegen scaffolds one op per HTTP call,
// but this focused "what tabs does this sheet have?" read is authored directly.
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
  })
  .strict();

const outputSchema = z.object({
  worksheets: z
    .array(
      z.object({
        sheet_id: z.number().describe("Numeric id (gid) of the worksheet."),
        title: z.string().describe("Worksheet (tab) title."),
        index: z
          .number()
          .describe("0-based position of the worksheet among the tabs."),
        row_count: z.number().describe("Number of rows in the worksheet grid."),
        column_count: z
          .number()
          .describe("Number of columns in the worksheet grid."),
      }),
    )
    .describe("The worksheets (tabs) in the spreadsheet, in tab order."),
});

const definition = defineTool({
  name: "listWorksheets",
  title: "List Worksheets",
  description:
    "List the worksheets (tabs) in a spreadsheet, with their ids, titles, positions, and grid size. Use to discover tab titles before reading or writing data.",
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
    const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=${encodeURIComponent("sheets.properties(sheetId,title,index,gridProperties)")}`;
    const res = await googleSheetsFetch(ctx.fetch, url, { method: "GET" });
    const data = (await res.json()) as {
      sheets?: {
        properties?: {
          sheetId?: number;
          title?: string;
          index?: number;
          gridProperties?: { rowCount?: number; columnCount?: number };
        };
      }[];
    };

    return {
      worksheets: (data.sheets ?? []).map((s) => {
        const p = s.properties ?? {};
        return {
          sheet_id: p.sheetId ?? 0,
          title: p.title ?? "",
          index: p.index ?? 0,
          row_count: p.gridProperties?.rowCount ?? 0,
          column_count: p.gridProperties?.columnCount ?? 0,
        };
      }),
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
