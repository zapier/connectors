#!/usr/bin/env node
// Authored by the implementation agent: codegen scaffolds one HTTP call per op, but
// every structural Sheets tool POSTs the same /{id}:batchUpdate path with a different
// requests[] member — so addWorksheet (an addSheet request) is authored directly.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { quoteSheetName } from "../lib/a1.ts";
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
    title: z
      .string()
      .describe(
        "Title for the new worksheet. Fails if a worksheet with this title already exists.",
      ),
    headers: z
      .array(z.string())
      .optional()
      .describe("Column header labels to write to row 1 of the new worksheet."),
    row_count: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Initial row count (Google defaults to ~1000 if omitted)."),
    column_count: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Initial column count (Google defaults to ~26 if omitted)."),
  })
  .strict();

const outputSchema = z.object({
  sheet_id: z.number().describe("Numeric id (gid) of the new worksheet."),
  title: z.string().describe("Title of the new worksheet."),
  index: z
    .number()
    .describe("0-based position of the worksheet among the tabs."),
  spreadsheet_id: z.string().describe("The spreadsheet id."),
});

const definition = defineTool({
  name: "addWorksheet",
  title: "Add Worksheet",
  description:
    "Add a new worksheet (tab) to a spreadsheet, optionally with a header row. Fails if the title already exists; to replace a tab, deleteWorksheet then addWorksheet.",
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
    const spreadsheetId = normalizeSpreadsheetId(input.spreadsheet);
    const gridProperties: Record<string, number> = {};
    if (input.row_count !== undefined)
      gridProperties.rowCount = input.row_count;
    if (input.column_count !== undefined)
      gridProperties.columnCount = input.column_count;

    const res = await googleSheetsFetch(
      ctx.fetch,
      `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: input.title,
                  ...(Object.keys(gridProperties).length > 0
                    ? { gridProperties }
                    : {}),
                },
              },
            },
          ],
        }),
      },
    );
    const data = (await res.json()) as {
      replies?: {
        addSheet?: {
          properties?: { sheetId?: number; title?: string; index?: number };
        };
      }[];
    };
    const props = data.replies?.[0]?.addSheet?.properties ?? {};

    if (input.headers && input.headers.length > 0) {
      const writeUrl = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${quoteSheetName(input.title)}!A1`)}?valueInputOption=USER_ENTERED`;
      await googleSheetsFetch(ctx.fetch, writeUrl, {
        method: "PUT",
        body: JSON.stringify({ values: [input.headers] }),
      });
    }

    return {
      sheet_id: props.sheetId ?? 0,
      title: props.title ?? input.title,
      index: props.index ?? 0,
      spreadsheet_id: spreadsheetId,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
