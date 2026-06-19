#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SHEETS_BASE } from "../lib/constants.ts";
import { googleSheetsFetch } from "../lib/sheetsFetch.ts";

const inputSchema = z
  .object({
    properties: z
      .object({
        title: z.string().describe("Name of the new spreadsheet."),
        locale: z
          .string()
          .describe(
            "Spreadsheet locale, e.g. en_US — affects number/date parsing.",
          )
          .optional(),
        timeZone: z
          .string()
          .describe(
            "IANA time zone, e.g. America/New_York — used for date interpretation.",
          )
          .optional(),
      })
      .strict(),
    sheets: z
      .array(
        z
          .object({
            properties: z
              .object({
                title: z.string().describe("Worksheet (tab) title.").optional(),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .describe(
        "Initial worksheets to create. Omit for a single default worksheet.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  spreadsheetId: z
    .string()
    .describe("The spreadsheet's unique id — pass this to other tools."),
  spreadsheetUrl: z.string().describe("Web URL of the spreadsheet."),
  properties: z
    .object({
      title: z.string().optional(),
      locale: z.string().optional(),
      timeZone: z
        .string()
        .describe(
          "The spreadsheet's time zone — governs how dates/serial numbers are interpreted.",
        )
        .optional(),
    })
    .optional(),
  sheets: z
    .array(
      z.object({
        properties: z
          .any()
          .describe("Nested SheetProperties object — shape passes through.")
          .optional(),
      }),
    )
    .describe("The worksheets (tabs) in this spreadsheet.")
    .optional(),
});

const definition = defineTool({
  name: "createSpreadsheet",
  title: "Create Spreadsheet",
  description:
    "Create a new spreadsheet with a title and optional initial worksheets. Returns the new spreadsheetId and URL. To add a header row or data, follow with updateValues/createRow.",
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
    const url = `${SHEETS_BASE}/spreadsheets`;
    const body: Record<string, unknown> = {};
    if (input.properties !== undefined) body["properties"] = input.properties;
    if (input.sheets !== undefined) body["sheets"] = input.sheets;
    const res = await googleSheetsFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
