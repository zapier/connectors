#!/usr/bin/env node
// Authored by the implementation agent: every structural Sheets tool POSTs the same
// /{id}:batchUpdate path with a different requests[] member, so copyRange is authored
// directly.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { a1ToGridRange } from "../lib/a1.ts";
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
      .describe(
        "Title of the source worksheet (also the destination unless overridden).",
      ),
    source_range: z
      .string()
      .describe(
        'A1 range to copy from, without the sheet prefix (e.g. "A1:C10").',
      ),
    destination_range: z
      .string()
      .describe(
        'A1 range to paste to; a single cell (e.g. "E1") anchors a full-size paste.',
      ),
    destination_worksheet: z
      .string()
      .optional()
      .describe(
        "Paste into a different worksheet (defaults to the source worksheet).",
      ),
    paste_type: z
      .enum([
        "NORMAL",
        "VALUES",
        "FORMAT",
        "FORMULA",
        "DATA_VALIDATION",
        "CONDITIONAL_FORMATTING",
      ])
      .optional()
      .describe(
        "What to copy (default NORMAL = values + formatting + formulas).",
      ),
  })
  .strict();

const outputSchema = z.object({
  destination_range: z.string().describe("The A1 range that was pasted to."),
});

const definition = defineTool({
  name: "copyRange",
  title: "Copy Range",
  description:
    "Copy a range of cells (values and/or formatting) to another location in the same or a different worksheet. paste_type controls what is copied.",
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
    const sourceSheetId = await resolveSheetId(
      ctx.fetch,
      spreadsheetId,
      input.worksheet,
    );
    const destinationWorksheet = input.destination_worksheet ?? input.worksheet;
    const destinationSheetId =
      destinationWorksheet === input.worksheet
        ? sourceSheetId
        : await resolveSheetId(ctx.fetch, spreadsheetId, destinationWorksheet);

    const source = a1ToGridRange(sourceSheetId, input.source_range);
    const destination = a1ToGridRange(
      destinationSheetId,
      input.destination_range,
    );
    const pasteType = `PASTE_${input.paste_type ?? "NORMAL"}`;

    await googleSheetsFetch(
      ctx.fetch,
      `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: "POST",
        body: JSON.stringify({
          requests: [
            {
              copyPaste: {
                source,
                destination,
                pasteType,
                pasteOrientation: "NORMAL",
              },
            },
          ],
        }),
      },
    );

    return { destination_range: input.destination_range };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
