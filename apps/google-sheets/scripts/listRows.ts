#!/usr/bin/env node
// Authored by the implementation agent: codegen only scaffolds single-HTTP-call ops;
// listRows is a header composition — it reads a bounded row window, right-pads ragged
// rows to the header width (§3e), maps each to a header-keyed record, and returns an
// explicit next_start_row for the agent to page the tail (PLAN §3h, no auto-pagination).
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { quoteSheetName } from "../lib/a1.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import { readHeaders, rowToRecord } from "../lib/headers.ts";
import { recordOutputSchema } from "../lib/schemas.ts";
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
      .describe("Worksheet (tab) title to read, e.g. Sheet1."),
    start_row: z
      .number()
      .int()
      .positive()
      .default(2)
      .describe(
        "1-based first data row to return (default 2 — row 1 is the header).",
      ),
    row_count: z
      .number()
      .int()
      .positive()
      .max(1500)
      .default(25)
      .describe("Number of rows to return. Defaults to 25; max 1,500."),
  })
  .strict();

const outputSchema = z.object({
  rows: z
    .array(
      z.object({
        row_number: z.number(),
        values: recordOutputSchema,
      }),
    )
    .describe("The window of rows as header-keyed records."),
  next_start_row: z
    .number()
    .nullable()
    .describe(
      "start_row to pass next to page the tail, or null when the window returned fewer rows than requested (worksheet exhausted).",
    ),
});

const definition = defineTool({
  name: "listRows",
  title: "List Rows",
  description:
    "Read a bounded window of rows from a worksheet as header-keyed records. Page the tail with next_start_row. For raw cells/formulas/a specific rectangle use getValues.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
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

    const endRow = input.start_row + input.row_count - 1;
    const range = `${quoteSheetName(input.worksheet)}!A${input.start_row}:${endRow}`;
    const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE`;
    const res = await googleSheetsFetch(ctx.fetch, url);
    const data = (await res.json()) as { values?: unknown[][] };
    const dataRows = data.values ?? [];

    const rows = dataRows.map((row, i) => ({
      row_number: input.start_row + i,
      values: rowToRecord(headers, row),
    }));

    const nextStartRow =
      dataRows.length === input.row_count
        ? input.start_row + input.row_count
        : null;

    return { rows, next_start_row: nextStartRow };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
