#!/usr/bin/env node
// Authored by the implementation agent: codegen only scaffolds single-HTTP-call ops,
// and createRow is a header composition — it reads the worksheet's header row, maps
// the values object to a positional cell array, appends with INSERT_ROWS, then parses
// the landing row number from the append response (PLAN §3f).
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { quoteSheetName } from "../lib/a1.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import {
  parseFirstRowNumber,
  readHeaders,
  recordToAppendCells,
  resolveSheetId,
} from "../lib/headers.ts";
import { recordInputSchema, recordOutputSchema } from "../lib/schemas.ts";
import { googleSheetsFetch } from "../lib/sheetsFetch.ts";
import { normalizeSpreadsheetId } from "../lib/spreadsheetId.ts";

/** Stringify every value so the echoed record matches the read tools' string shape. */
function toStringRecord(
  values: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, String(v)]),
  );
}

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
    values: recordInputSchema.describe(
      'Row data keyed by column-header label, e.g. {"Date":"2026-06-18","Amount":42.5,"Status":"Open"}. Unknown headers are rejected. Values are parsed like UI entry (formulas, dates, numbers); discover headers with getValues on row 1 if unsure.',
    ),
    insert: z
      .enum(["bottom", "top"])
      .default("bottom")
      .describe(
        "Where to add the row: bottom (default, append after the last row) or top (insert as the new first data row, right under the header).",
      ),
  })
  .strict();

const outputSchema = z.object({
  row_number: z
    .number()
    .describe("The 1-based row number the new row landed on."),
  values: recordOutputSchema.describe("The row values that were written."),
});

const definition = defineTool({
  name: "createRow",
  title: "Create Row",
  description:
    "Append a single row to a worksheet, given values keyed by column header. Use for 'log this' / 'add a row' jobs. For many rows at once use createRows.",
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
    const cells = recordToAppendCells(headers, input.values);

    if (input.insert === "top") {
      // Insert a blank row at row index 1 (just under the header), then write into it.
      const gid = await resolveSheetId(
        ctx.fetch,
        spreadsheetId,
        input.worksheet,
      );
      await googleSheetsFetch(
        ctx.fetch,
        `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
        {
          method: "POST",
          body: JSON.stringify({
            requests: [
              {
                insertDimension: {
                  range: {
                    sheetId: gid,
                    dimension: "ROWS",
                    startIndex: 1,
                    endIndex: 2,
                  },
                  inheritFromBefore: false,
                },
              },
            ],
          }),
        },
      );
      const writeUrl = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${quoteSheetName(input.worksheet)}!A2`)}?valueInputOption=USER_ENTERED`;
      await googleSheetsFetch(ctx.fetch, writeUrl, {
        method: "PUT",
        body: JSON.stringify({ values: [cells] }),
      });
      return { row_number: 2, values: toStringRecord(input.values) };
    }

    const appendUrl = `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(`${quoteSheetName(input.worksheet)}!A1`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const res = await googleSheetsFetch(ctx.fetch, appendUrl, {
      method: "POST",
      body: JSON.stringify({ values: [cells] }),
    });
    const data = (await res.json()) as { updates?: { updatedRange?: string } };
    const updatedRange = data.updates?.updatedRange ?? "";
    return {
      row_number: parseFirstRowNumber(updatedRange),
      values: toStringRecord(input.values),
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
