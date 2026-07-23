#!/usr/bin/env node
// Authored by the implementation agent: every structural Sheets tool POSTs the same
// /{id}:batchUpdate path with a different requests[] member, so formatCells is authored
// directly.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { a1ToGridRange } from "../lib/a1.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import { resolveSheetId } from "../lib/headers.ts";
import { googleSheetsFetch } from "../lib/sheetsFetch.ts";
import { normalizeSpreadsheetId } from "../lib/spreadsheetId.ts";

/** Parse "#RRGGBB" hex into a Google Sheets Color {red,green,blue} with 0-1 floats. */
function hexToColor(hex: string): { red: number; green: number; blue: number } {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) {
    throw new Error(
      `Invalid color "${hex}". Provide a 6-digit hex color like "#RRGGBB" (e.g. "#FF0000").`,
    );
  }
  const int = parseInt(m[1], 16);
  return {
    red: ((int >> 16) & 0xff) / 255,
    green: ((int >> 8) & 0xff) / 255,
    blue: (int & 0xff) / 255,
  };
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
      .describe("Title of the worksheet containing the range."),
    range: z
      .string()
      .describe(
        'A1 range to format, without the sheet prefix (e.g. "A1:C10", "A:A" whole column, "1:1" whole row).',
      ),
    number_format: z
      .strictObject({
        type: z
          .enum(["DATE", "NUMBER", "CURRENCY", "PERCENT", "SCIENTIFIC", "TEXT"])
          .describe(
            "Number-format category. TEXT preserves leading zeros and exact strings.",
          ),
        pattern: z
          .string()
          .optional()
          .describe('Optional format pattern (e.g. "#,##0.00", "yyyy-mm-dd").'),
      })
      .optional()
      .describe("Number/date/currency formatting to apply to the cells."),
    background_color: z
      .string()
      .optional()
      .describe('Cell background color as hex "#RRGGBB".'),
    text_color: z
      .string()
      .optional()
      .describe('Text (foreground) color as hex "#RRGGBB".'),
    bold: z.boolean().optional().describe("Bold the text."),
    italic: z.boolean().optional().describe("Italicize the text."),
    strikethrough: z.boolean().optional().describe("Strike through the text."),
  })
  .strict();

const outputSchema = z.object({
  formatted_range: z.string().describe("The A1 range that was formatted."),
});

const definition = defineTool({
  name: "formatCells",
  title: "Format Cells",
  description:
    "Apply number/date/currency formatting or text styling (color, bold, italic, strikethrough) to a cell range. Use number_format.type TEXT to preserve leading zeros.",
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

    const userEnteredFormat: Record<string, unknown> = {};
    const fields: string[] = [];

    if (input.number_format) {
      userEnteredFormat.numberFormat = {
        type: input.number_format.type,
        ...(input.number_format.pattern !== undefined
          ? { pattern: input.number_format.pattern }
          : {}),
      };
      fields.push("userEnteredFormat.numberFormat");
    }
    if (input.background_color !== undefined) {
      userEnteredFormat.backgroundColor = hexToColor(input.background_color);
      fields.push("userEnteredFormat.backgroundColor");
    }

    const textFormat: Record<string, unknown> = {};
    if (input.text_color !== undefined) {
      textFormat.foregroundColor = hexToColor(input.text_color);
      fields.push("userEnteredFormat.textFormat.foregroundColor");
    }
    if (input.bold !== undefined) {
      textFormat.bold = input.bold;
      fields.push("userEnteredFormat.textFormat.bold");
    }
    if (input.italic !== undefined) {
      textFormat.italic = input.italic;
      fields.push("userEnteredFormat.textFormat.italic");
    }
    if (input.strikethrough !== undefined) {
      textFormat.strikethrough = input.strikethrough;
      fields.push("userEnteredFormat.textFormat.strikethrough");
    }
    if (Object.keys(textFormat).length > 0) {
      userEnteredFormat.textFormat = textFormat;
    }

    if (fields.length === 0) {
      throw new Error(
        "No formatting specified. Provide at least one of: number_format, background_color, text_color, bold, italic, strikethrough.",
      );
    }

    await googleSheetsFetch(
      ctx.fetch,
      `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range,
                cell: { userEnteredFormat },
                fields: fields.join(","),
              },
            },
          ],
        }),
      },
    );

    return { formatted_range: input.range };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
