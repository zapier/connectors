#!/usr/bin/env node
// Authored by the implementation agent: codegen only scaffolds single-HTTP-call ops;
// createRows is a header composition — it reads the worksheet's header row, maps each
// record to a positional cell array, appends them all in one INSERT_ROWS values.append,
// then parses the contiguous landing range from the response (PLAN §3f).
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { quoteSheetName } from "../lib/a1.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import {
  parseFirstRowNumber,
  readHeaders,
  recordToAppendCells,
} from "../lib/headers.ts";
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
      .describe(
        "Worksheet (tab) title to append to, e.g. Sheet1. The worksheet must have column headers in row 1.",
      ),
    rows: z
      .array(recordInputSchema)
      .describe(
        'Array of row objects, each keyed by column-header label (same shape as createRow.values), e.g. [{"Date":"2026-06-18","Amount":42.5},{"Date":"2026-06-19","Amount":10}]. Unknown headers are rejected. Values are parsed like UI entry (formulas, dates, numbers). All rows are appended in one batched request.',
      ),
  })
  .strict();

const outputSchema = z.object({
  row_count: z.number().describe("Number of rows appended."),
  first_row_number: z
    .number()
    .describe("The 1-based row number of the first appended row."),
  last_row_number: z
    .number()
    .describe("The 1-based row number of the last appended row."),
});

const definition = defineTool({
  name: "createRows",
  title: "Create Rows",
  description:
    "Append multiple rows to a worksheet in one batched call, each keyed by column header. Use for bulk 'add these rows' jobs. For a single row use createRow.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
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
    const values = input.rows.map((r) => recordToAppendCells(headers, r));

    const appendUrl = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${quoteSheetName(input.worksheet)}!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const res = await googleSheetsFetch(ctx.fetch, appendUrl, {
      method: "POST",
      body: JSON.stringify({ values }),
    });
    const data = (await res.json()) as { updates?: { updatedRange?: string } };
    const updatedRange = data.updates?.updatedRange ?? "";
    const firstRowNumber = parseFirstRowNumber(updatedRange);
    const rowCount = input.rows.length;
    return {
      row_count: rowCount,
      first_row_number: firstRowNumber,
      last_row_number: firstRowNumber + rowCount - 1,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
