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
    includeGridData: z
      .boolean()
      .describe(
        "Include all cell data for every worksheet. Default false — grid data on a large sheet is huge; prefer getValues/listRows for data.",
      )
      .default(false),
  })
  .strict();
const outputSchema = z.object({
  spreadsheetId: z
    .string()
    .describe("The spreadsheet's unique id — pass this to other tools."),
  spreadsheetUrl: z.string().describe("Web URL of the spreadsheet."),
  properties: z
    .object({
      title: z.string().optional(),
      locale: z.string().optional(),
      timeZone: z
        .string()
        .describe(
          "The spreadsheet's time zone — governs how dates/serial numbers are interpreted.",
        )
        .optional(),
    })
    .optional(),
  sheets: z
    .array(
      z.object({
        properties: z
          .object({
            sheetId: z
              .number()
              .describe("Numeric worksheet id (gid).")
              .optional(),
            title: z.string().describe("Worksheet (tab) title.").optional(),
            index: z
              .number()
              .describe("0-based position of the worksheet.")
              .optional(),
          })
          .describe(
            "Worksheet properties. For a focused worksheet list use listWorksheets.",
          )
          .optional(),
      }),
    )
    .describe("The worksheets (tabs) in this spreadsheet.")
    .optional(),
});

const definition = defineTool({
  name: "getSpreadsheet",
  title: "Get Spreadsheet",
  description:
    "Retrieve a spreadsheet's metadata and its list of worksheets (no cell data unless includeGridData is true). Use getValues or listRows to read data.",
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
    const url = new URL(
      `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(normalizeSpreadsheetId(input.spreadsheet))}`,
    );
    if (input.includeGridData !== undefined) {
      url.searchParams.set("includeGridData", String(input.includeGridData));
    }
    const res = await googleSheetsFetch(ctx.fetch, url.toString(), {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
