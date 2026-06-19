#!/usr/bin/env node
// Authored by the implementation agent: every structural Sheets tool POSTs the same
// /{id}:batchUpdate path with a different requests[] member — addColumn (an
// insertDimension/appendDimension request) shares that batchUpdate path and is authored directly.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { columnIndexToLetter, quoteSheetName } from "../lib/a1.ts";
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
      .describe("Title of the worksheet (tab) to add the column to."),
    index: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe(
        "0-based position to insert at (0 = column A, 1 = column B…). Omit to append at the end.",
      ),
    header: z
      .string()
      .optional()
      .describe("Header label written to row 1 of the new column."),
  })
  .strict();

const outputSchema = z.object({
  spreadsheet_id: z.string().describe("The spreadsheet id."),
  sheet_id: z.number().describe("Numeric id (gid) of the worksheet."),
  header_written: z
    .boolean()
    .describe("True if a header label was written to row 1 of the new column."),
});

const definition = defineTool({
  name: "addColumn",
  title: "Add Column",
  description:
    "Insert a new column into a worksheet, optionally with a header label in row 1. Provide index to insert at a position (0-based), or omit it to append the column at the end.",
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
    const gid = await resolveSheetId(ctx.fetch, spreadsheetId, input.worksheet);

    const request =
      input.index !== undefined
        ? {
            insertDimension: {
              range: {
                sheetId: gid,
                dimension: "COLUMNS",
                startIndex: input.index,
                endIndex: input.index + 1,
              },
              inheritFromBefore: input.index > 0,
            },
          }
        : {
            appendDimension: {
              sheetId: gid,
              dimension: "COLUMNS",
              length: 1,
            },
          };

    await googleSheetsFetch(
      ctx.fetch,
      `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({ requests: [request] }),
      },
    );

    let headerWritten = false;
    if (input.header !== undefined) {
      let columnIndex: number;
      if (input.index !== undefined) {
        columnIndex = input.index;
      } else {
        // Appended column is the last one: re-fetch the grid's column count.
        const res = await googleSheetsFetch(
          ctx.fetch,
          `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=${encodeURIComponent("sheets.properties(sheetId,gridProperties)")}`,
          { method: "GET" },
        );
        const data = (await res.json()) as {
          sheets?: {
            properties?: {
              sheetId?: number;
              gridProperties?: { columnCount?: number };
            };
          }[];
        };
        const match = data.sheets?.find((s) => s.properties?.sheetId === gid);
        const columnCount = match?.properties?.gridProperties?.columnCount ?? 1;
        columnIndex = columnCount - 1;
      }

      const letter = columnIndexToLetter(columnIndex);
      const range = `${quoteSheetName(input.worksheet)}!${letter}1`;
      const writeUrl = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
      await googleSheetsFetch(ctx.fetch, writeUrl, {
        method: "PUT",
        body: JSON.stringify({ values: [[input.header]] }),
      });
      headerWritten = true;
    }

    return {
      spreadsheet_id: spreadsheetId,
      sheet_id: gid,
      header_written: headerWritten,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
