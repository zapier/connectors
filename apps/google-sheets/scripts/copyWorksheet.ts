#!/usr/bin/env node
// Authored by the implementation agent: the agent surface takes a worksheet TITLE
// (PLAN §3b — the agent never has to know the numeric gid), so run() resolves the title
// to a sheetId before the copyTo call. That title->gid pre-step makes it a composition,
// not a raw single-call scaffold.
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
        "Source spreadsheet id, or a full Google Sheets URL (the connector extracts the id).",
      ),
    worksheet: z
      .string()
      .describe(
        "Title of the source worksheet (tab) to copy, e.g. Sheet1. Resolved to its numeric id for you.",
      ),
    destination_spreadsheet: z
      .string()
      .describe(
        "Destination spreadsheet id or URL to copy the worksheet into. Can equal the source to duplicate within the same spreadsheet.",
      ),
  })
  .strict();

const outputSchema = z.object({
  sheet_id: z
    .number()
    .describe(
      "Numeric id (gid) of the newly created worksheet in the destination.",
    ),
  title: z
    .string()
    .describe("Title of the new worksheet (e.g. 'Copy of Sheet1')."),
  index: z
    .number()
    .describe("0-based position of the new worksheet among the tabs."),
});

const definition = defineTool({
  name: "copyWorksheet",
  title: "Copy Worksheet",
  description:
    "Copy a worksheet into another spreadsheet (or duplicate it within the same one). Pass the source worksheet by title; returns the new worksheet's id, title, and position.",
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
    const sheetId = await resolveSheetId(
      ctx.fetch,
      spreadsheetId,
      input.worksheet,
    );
    const res = await googleSheetsFetch(
      ctx.fetch,
      `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(spreadsheetId)}/sheets/${sheetId}:copyTo`,
      {
        method: "POST",
        body: JSON.stringify({
          destinationSpreadsheetId: normalizeSpreadsheetId(
            input.destination_spreadsheet,
          ),
        }),
      },
    );
    const props = (await res.json()) as {
      sheetId?: number;
      title?: string;
      index?: number;
    };
    return {
      sheet_id: props.sheetId ?? 0,
      title: props.title ?? "",
      index: props.index ?? 0,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
