#!/usr/bin/env node
// Authored by the implementation agent: the create call is one HTTP request, but the
// agent surface is a flat { title, worksheet_titles, headers, ... } (PLAN §4 #1) — not
// Google's nested { properties, sheets[].properties } body — and the optional header row
// is a follow-up values.update, so this is a small composition rather than a raw scaffold.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { quoteSheetName } from "../lib/a1.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import { googleSheetsFetch } from "../lib/sheetsFetch.ts";

const inputSchema = z
  .object({
    title: z.string().describe("Name of the new spreadsheet."),
    worksheet_titles: z
      .array(z.string())
      .optional()
      .describe(
        "Titles for the initial worksheets (tabs). Omit for a single default worksheet named 'Sheet1'.",
      ),
    headers: z
      .array(z.string())
      .optional()
      .describe(
        "Column header labels to write to row 1 of the first worksheet (e.g. ['Date','Amount','Category']).",
      ),
    locale: z
      .string()
      .optional()
      .describe(
        "Spreadsheet locale, e.g. en_US — affects number/date parsing.",
      ),
    time_zone: z
      .string()
      .optional()
      .describe(
        "IANA time zone, e.g. America/New_York — used for date interpretation.",
      ),
  })
  .strict();

const outputSchema = z.object({
  spreadsheet_id: z
    .string()
    .describe("The spreadsheet's unique id — pass this to other tools."),
  spreadsheet_url: z.string().describe("Web URL of the spreadsheet."),
  title: z.string().describe("The spreadsheet title."),
  worksheets: z
    .array(
      z.object({
        sheet_id: z.number().describe("Numeric worksheet id (gid)."),
        title: z.string().describe("Worksheet (tab) title."),
        index: z.number().describe("0-based position of the worksheet."),
      }),
    )
    .describe("The worksheets (tabs) created in this spreadsheet."),
});

const definition = defineTool({
  name: "createSpreadsheet",
  title: "Create Spreadsheet",
  description:
    "Create a new spreadsheet with a title and optional initial worksheets and a header row. Returns the new spreadsheet id and URL. Use createRow/updateValues to add data afterward.",
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
    const properties: Record<string, unknown> = { title: input.title };
    if (input.locale !== undefined) properties.locale = input.locale;
    if (input.time_zone !== undefined) properties.timeZone = input.time_zone;
    const body: Record<string, unknown> = { properties };
    if (input.worksheet_titles && input.worksheet_titles.length > 0) {
      body.sheets = input.worksheet_titles.map((title) => ({
        properties: { title },
      }));
    }

    const res = await googleSheetsFetch(
      ctx.fetch,
      `${SHEETS_BASE}/spreadsheets`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    const data = (await res.json()) as {
      spreadsheetId: string;
      spreadsheetUrl: string;
      properties?: { title?: string };
      sheets?: {
        properties: { sheetId: number; title: string; index: number };
      }[];
    };

    const firstWorksheet = data.sheets?.[0]?.properties.title ?? "Sheet1";
    if (input.headers && input.headers.length > 0) {
      const range = `${quoteSheetName(firstWorksheet)}!A1`;
      await googleSheetsFetch(
        ctx.fetch,
        `${SHEETS_BASE}/spreadsheets/${encodeURIComponent(data.spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        { method: "PUT", body: JSON.stringify({ values: [input.headers] }) },
      );
    }

    return {
      spreadsheet_id: data.spreadsheetId,
      spreadsheet_url: data.spreadsheetUrl,
      title: data.properties?.title ?? input.title,
      worksheets: (data.sheets ?? []).map((s) => ({
        sheet_id: s.properties.sheetId,
        title: s.properties.title,
        index: s.properties.index,
      })),
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
