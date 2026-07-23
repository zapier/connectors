#!/usr/bin/env node
// Authored by the implementation agent: every structural Sheets tool POSTs the same
// /{id}:batchUpdate path with a different requests[] member, so sortRange is authored
// directly.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { a1ToGridRange, columnLetterToIndex } from "../lib/a1.ts";
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
      .describe("Title of the worksheet containing the range."),
    range: z
      .string()
      .describe(
        'A1 range to sort, without the sheet prefix; exclude the header row (e.g. "A2:D100").',
      ),
    sort_specs: z
      .array(
        z.strictObject({
          column: z
            .string()
            .describe(
              'Column to sort by, as a column letter (e.g. "A", "C"). Must lie within range.',
            ),
          order: z
            .enum(["ASCENDING", "DESCENDING"])
            .describe("Sort direction for this column."),
        }),
      )
      .min(1)
      .describe(
        "Ordered list of sort columns (first is the primary sort key).",
      ),
  })
  .strict();

const outputSchema = z.object({
  sorted_range: z.string().describe("The A1 range that was sorted."),
});

const definition = defineTool({
  name: "sortRange",
  title: "Sort Range",
  description:
    "Sort a range of cells by one or more columns. Exclude the header row from the range. Each sort spec names a column letter and a direction.",
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
    const sheetId = await resolveSheetId(
      ctx.fetch,
      spreadsheetId,
      input.worksheet,
    );
    const range = a1ToGridRange(sheetId, input.range);

    const sortSpecs = input.sort_specs.map((spec) => {
      // Google's sortRange dimensionIndex is the absolute sheet column index.
      const dimensionIndex = columnLetterToIndex(spec.column);
      // Validate the sort column falls within the range's columns (the API otherwise
      // 400s with a less-clear message). Only check when the range has column bounds
      // (a whole-row range like "1:1" has none).
      if (
        range.startColumnIndex !== undefined &&
        range.endColumnIndex !== undefined &&
        (dimensionIndex < range.startColumnIndex ||
          dimensionIndex >= range.endColumnIndex)
      ) {
        throw new Error(
          `Sort column "${spec.column}" is outside the range "${input.range}". The sort column must lie within the range's columns.`,
        );
      }
      return { dimensionIndex, sortOrder: spec.order };
    });

    await googleSheetsFetch(
      ctx.fetch,
      `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [{ sortRange: { range, sortSpecs } }],
        }),
      },
    );

    return { sorted_range: input.range };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
