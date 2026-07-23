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
        "A1 range to write, sheet-qualified and quoted (e.g. 'Sheet1'!A1:C3). Always qualify the worksheet — an unqualified range targets the first visible sheet.",
      ),
    majorDimension: z
      .enum(["ROWS", "COLUMNS"])
      .describe("Orientation of the values array — ROWS (default) or COLUMNS.")
      .default("ROWS"),
    values: z
      .array(z.array(cellValueSchema))
      .describe("2-D array of cell values to write (rows of cells)."),
    valueInputOption: z
      .enum(["USER_ENTERED", "RAW"])
      .describe(
        "How input is interpreted. USER_ENTERED (default) parses like UI typing (formulas, dates, numbers; strips leading zeros). RAW stores values exactly as sent — use for IDs/ZIP codes/literal text.",
      )
      .default("USER_ENTERED"),
    includeValuesInResponse: z
      .boolean()
      .describe("Return the updated cells in the response. Default false.")
      .default(false),
  })
  .strict();
const outputSchema = z.object({
  spreadsheetId: z.string(),
  updatedRange: z.string().describe("The A1 range that was actually updated."),
  updatedRows: z.number().int().optional(),
  updatedColumns: z.number().int().optional(),
  updatedCells: z.number().int().optional(),
});

const definition = defineTool({
  name: "updateValues",
  title: "Update Values",
  description:
    "Write a 2-D array of values to a cell range in A1 notation. Use valueInputOption RAW to store text exactly (IDs, leading zeros) or USER_ENTERED to parse formulas/dates/numbers.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    // Overwrites whatever is currently in the target range — flagged destructive
    // so the host can confirm before clobbering existing cells (PLAN §3j).
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-sheets-plg",
  run: async (input, ctx) => {
    const url = new URL(
      `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(normalizeSpreadsheetId(input.spreadsheet))}/values/${encodeURIComponent(input.range)}`,
    );
    if (input.valueInputOption !== undefined) {
      url.searchParams.set("valueInputOption", String(input.valueInputOption));
    }
    if (input.includeValuesInResponse !== undefined) {
      url.searchParams.set(
        "includeValuesInResponse",
        String(input.includeValuesInResponse),
      );
    }
    const body: Record<string, unknown> = {};
    if (input.range !== undefined) body["range"] = input.range;
    if (input.majorDimension !== undefined)
      body["majorDimension"] = input.majorDimension;
    if (input.values !== undefined) body["values"] = input.values;
    const res = await googleSheetsFetch(ctx.fetch, url.toString(), {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
