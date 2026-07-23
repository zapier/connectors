#!/usr/bin/env node
// Authored by the implementation agent: every structural Sheets tool POSTs the same
// /{id}:batchUpdate path with a different requests[] member, so addConditionalFormatRule
// is authored directly.
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

const VALUE_BEARING = new Set([
  "NUMBER_GREATER",
  "NUMBER_LESS",
  "TEXT_CONTAINS",
  "TEXT_EQ",
]);

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
        'A1 range the rule applies to, without the sheet prefix (e.g. "A2:A100").',
      ),
    condition_type: z
      .enum([
        "BLANK",
        "NOT_BLANK",
        "NUMBER_GREATER",
        "NUMBER_LESS",
        "TEXT_CONTAINS",
        "TEXT_EQ",
      ])
      .describe("When the formatting applies."),
    condition_value: z
      .string()
      .optional()
      .describe(
        "Comparison value. Required for NUMBER_GREATER, NUMBER_LESS, TEXT_CONTAINS, and TEXT_EQ.",
      ),
    background_color: z
      .string()
      .optional()
      .describe(
        'Background color to apply when the condition holds, as hex "#RRGGBB".',
      ),
    text_color: z
      .string()
      .optional()
      .describe(
        'Text color to apply when the condition holds, as hex "#RRGGBB".',
      ),
    bold: z
      .boolean()
      .optional()
      .describe("Bold the text when the condition holds."),
    italic: z
      .boolean()
      .optional()
      .describe("Italicize the text when the condition holds."),
  })
  .strict();

const outputSchema = z.object({
  rule_added: z.literal(true).describe("True when the rule was added."),
});

const definition = defineTool({
  name: "addConditionalFormatRule",
  title: "Add Conditional Format Rule",
  description:
    "Add a conditional-formatting rule (color/style applied when a condition holds) to a range. The rule is inserted at highest priority.",
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

    const valueBearing = VALUE_BEARING.has(input.condition_type);
    if (valueBearing && input.condition_value === undefined) {
      throw new Error(
        `condition_type ${input.condition_type} requires condition_value (the comparison value).`,
      );
    }

    const condition: { type: string; values?: { userEnteredValue: string }[] } =
      valueBearing
        ? {
            type: input.condition_type,
            values: [{ userEnteredValue: input.condition_value as string }],
          }
        : { type: input.condition_type };

    const format: Record<string, unknown> = {};
    if (input.background_color !== undefined) {
      format.backgroundColor = hexToColor(input.background_color);
    }
    const textFormat: Record<string, unknown> = {};
    if (input.text_color !== undefined) {
      textFormat.foregroundColor = hexToColor(input.text_color);
    }
    if (input.bold !== undefined) textFormat.bold = input.bold;
    if (input.italic !== undefined) textFormat.italic = input.italic;
    if (Object.keys(textFormat).length > 0) format.textFormat = textFormat;

    if (Object.keys(format).length === 0) {
      throw new Error(
        "No formatting specified. Provide at least one of: background_color, text_color, bold, italic.",
      );
    }

    const sheetId = await resolveSheetId(
      ctx.fetch,
      spreadsheetId,
      input.worksheet,
    );
    const gridRange = a1ToGridRange(sheetId, input.range);

    await googleSheetsFetch(
      ctx.fetch,
      `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              addConditionalFormatRule: {
                rule: {
                  ranges: [gridRange],
                  booleanRule: { condition, format },
                },
                index: 0,
              },
            },
          ],
        }),
      },
    );

    return { rule_added: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
