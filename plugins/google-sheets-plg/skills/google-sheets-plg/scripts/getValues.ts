#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import { cellValueSchema } from "../lib/schemas.ts";
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
        "A1 range, sheet-qualified and quoted — e.g. 'Sheet1'!A1:D10, 'Sheet1'!A:A, 'Sheet1'!1:1. This tool does not auto-prepend a worksheet name, so always qualify the range yourself — an unqualified range targets the first visible sheet.",
      ),
    majorDimension: z
      .enum(["ROWS", "COLUMNS"])
      .describe(
        "Orientation of the returned values — ROWS (default) returns an array of rows; COLUMNS returns an array of columns.",
      )
      .default("ROWS"),
    valueRenderOption: z
      .enum(["FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA"])
      .describe(
        "How values are returned. FORMATTED_VALUE (default) gives display strings; UNFORMATTED_VALUE gives raw numbers (full precision); FORMULA gives the underlying formulas.",
      )
      .default("FORMATTED_VALUE"),
    dateTimeRenderOption: z
      .enum(["SERIAL_NUMBER", "FORMATTED_STRING"])
      .describe(
        "How dates are returned when not FORMATTED_VALUE. SERIAL_NUMBER (default) gives days since 1899-12-30; FORMATTED_STRING gives the formatted date string.",
      )
      .default("SERIAL_NUMBER"),
  })
  .strict();
const outputSchema = z.object({
  range: z.string().describe("The A1 range the values cover.").optional(),
  majorDimension: z.enum(["ROWS", "COLUMNS"]).optional(),
  values: z
    .array(z.array(cellValueSchema))
    .describe(
      "2-D array of cell values. Trailing empty cells/rows are omitted, so rows may have different lengths.",
    )
    .optional(),
});

const definition = defineTool({
  name: "getValues",
  title: "Get Values",
  description:
    "Read a raw cell range in A1 notation. Returns a 2-D values array. Trailing empty cells/rows are omitted (rows may be ragged). For records keyed by header use listRows.",
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
      `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(normalizeSpreadsheetId(input.spreadsheet))}/values/${encodeURIComponent(input.range)}`,
    );
    url.searchParams.set("majorDimension", input.majorDimension);
    url.searchParams.set("valueRenderOption", input.valueRenderOption);
    url.searchParams.set("dateTimeRenderOption", input.dateTimeRenderOption);
    const res = await googleSheetsFetch(ctx.fetch, url.toString(), {
      method: "GET",
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
