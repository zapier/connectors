#!/usr/bin/env node
// Authored by the implementation agent: codegen only scaffolds single-HTTP-call ops;
// clearRows is a range composition — it maps each 1-based row number to a full-row A1
// range and clears them all in one values:batchClear. Contents are cleared but the rows
// (and their formatting) stay — nothing shifts (contrast deleteRows, PLAN §3g).
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
    worksheet: z
      .string()
      .describe("Worksheet (tab) title containing the rows, e.g. Sheet1."),
    rows: z
      .array(z.number().int().positive())
      .describe(
        "1-based row numbers to clear, e.g. [5] or [1,3,5]. Express a range as the explicit list of row numbers. The rows stay in place; only their contents are cleared.",
      ),
  })
  .strict();

const outputSchema = z.object({
  cleared_rows: z
    .array(z.number())
    .describe("The 1-based row numbers whose contents were cleared."),
});

const definition = defineTool({
  name: "clearRows",
  title: "Clear Rows",
  description:
    "Clear the contents of specific rows — the rows remain and nothing shifts (row numbers below are unchanged). To remove rows entirely and shift everything up, use deleteRows.",
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
    const spreadsheetId = normalizeSpreadsheetId(input.spreadsheet);
    const prefix = quoteSheetName(input.worksheet);
    const ranges = input.rows.map((n) => `${prefix}!${n}:${n}`);

    const url = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchClear`;
    await googleSheetsFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify({ ranges }),
    });

    return { cleared_rows: input.rows };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
