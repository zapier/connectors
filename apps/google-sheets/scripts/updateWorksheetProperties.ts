#!/usr/bin/env node
// Authored by the implementation agent: every structural Sheets tool POSTs the same
// /{id}:batchUpdate path with a different requests[] member — updateWorksheetProperties
// (an updateSheetProperties request) shares that batchUpdate path and is authored directly.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
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
    worksheet: z.string().describe("Title of the worksheet (tab) to modify."),
    new_title: z
      .string()
      .optional()
      .describe("Rename the worksheet to this title."),
    index: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Move the worksheet to this 0-based position among the tabs."),
    frozen_row_count: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe(
        "Freeze this many top rows (keeps headers visible while scrolling).",
      ),
    frozen_column_count: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Freeze this many left columns."),
    hidden: z
      .boolean()
      .optional()
      .describe(
        "Hide (true) or show (false) the worksheet. Cannot hide the only visible sheet.",
      ),
    tab_color: z
      .string()
      .optional()
      .describe(
        "Tab color as a hex string like #RRGGBB (e.g. #FF8800), or a named theme color.",
      ),
  })
  .strict();

const outputSchema = z.object({
  sheet_id: z.number().describe("Numeric id (gid) of the worksheet."),
  title: z.string().describe("Resulting worksheet title."),
  index: z.number().describe("Resulting 0-based position among the tabs."),
});

/** Parse "#RRGGBB" to a Google color { red, green, blue } with 0-1 float channels. */
function hexToColor(hex: string): { red: number; green: number; blue: number } {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) {
    throw new Error(
      `Invalid tab_color "${hex}". Use a hex string like #RRGGBB (e.g. #FF8800).`,
    );
  }
  const int = parseInt(m[1], 16);
  return {
    red: ((int >> 16) & 0xff) / 255,
    green: ((int >> 8) & 0xff) / 255,
    blue: (int & 0xff) / 255,
  };
}

const definition = defineTool({
  name: "updateWorksheetProperties",
  title: "Update Worksheet Properties",
  description:
    "Rename a worksheet, move it to a new position, freeze rows/columns, hide/show it, or set its tab color. Only the fields you provide are changed.",
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

    const properties: Record<string, unknown> = { sheetId: gid };
    const fields: string[] = [];

    if (input.new_title !== undefined) {
      properties.title = input.new_title;
      fields.push("title");
    }
    if (input.index !== undefined) {
      properties.index = input.index;
      fields.push("index");
    }
    const gridProperties: Record<string, number> = {};
    if (input.frozen_row_count !== undefined) {
      gridProperties.frozenRowCount = input.frozen_row_count;
      fields.push("gridProperties.frozenRowCount");
    }
    if (input.frozen_column_count !== undefined) {
      gridProperties.frozenColumnCount = input.frozen_column_count;
      fields.push("gridProperties.frozenColumnCount");
    }
    if (Object.keys(gridProperties).length > 0) {
      properties.gridProperties = gridProperties;
    }
    if (input.hidden !== undefined) {
      properties.hidden = input.hidden;
      fields.push("hidden");
    }
    if (input.tab_color !== undefined) {
      properties.tabColor = hexToColor(input.tab_color);
      fields.push("tabColor");
    }

    if (fields.length === 0) {
      throw new Error(
        "Provide at least one property to change (new_title, index, frozen_row_count, frozen_column_count, hidden, or tab_color).",
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
              updateSheetProperties: { properties, fields: fields.join(",") },
            },
          ],
        }),
      },
    );

    return {
      sheet_id: gid,
      title: input.new_title ?? input.worksheet,
      index: input.index ?? 0,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
