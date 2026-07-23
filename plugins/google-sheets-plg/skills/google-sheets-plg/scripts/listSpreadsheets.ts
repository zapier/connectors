#!/usr/bin/env node
// Authored by the implementation agent: this is the one tool on a different host —
// it queries the Drive API (files.list) rather than the Sheets API, so codegen's
// Sheets-host scaffold doesn't fit; the OAuth bearer works on both hosts.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { DRIVE_BASE, SPREADSHEET_MIME } from "../lib/constants.ts";
import { googleSheetsFetch } from "../lib/sheetsFetch.ts";

const inputSchema = z
  .object({
    name_contains: z
      .string()
      .optional()
      .describe(
        "Filter to spreadsheets whose name contains this text (case-insensitive). Omit to list recent spreadsheets.",
      ),
    drive_id: z
      .string()
      .optional()
      .describe(
        "Restrict to a specific shared drive (omit for My Drive + shared-with-me).",
      ),
    page_token: z
      .string()
      .optional()
      .describe("Cursor from a previous call's next_page_token."),
    limit: z
      .number()
      .int()
      .positive()
      .default(20)
      .describe("Max results to return. Defaults to 20."),
  })
  .strict();

const outputSchema = z.object({
  spreadsheets: z
    .array(
      z.object({
        spreadsheet_id: z
          .string()
          .describe("Spreadsheet id — feed this to any other tool."),
        name: z.string().describe("Spreadsheet name."),
        modified_time: z
          .string()
          .describe("Last-modified timestamp (RFC 3339)."),
        web_view_link: z
          .string()
          .describe("URL to open the spreadsheet in the browser."),
      }),
    )
    .describe("Matching spreadsheets, most-recently-modified first."),
  next_page_token: z
    .string()
    .nullable()
    .describe(
      "Cursor for the next page, or null when there are no more results.",
    ),
});

const definition = defineTool({
  name: "listSpreadsheets",
  title: "List Spreadsheets",
  description:
    "Find spreadsheets in the connected Google Drive by name — the discovery entry point when you only know a spreadsheet's name, not its id. Requires Google Drive access; if that scope isn't granted you can instead pass a spreadsheet URL or id directly to any other tool.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-sheets-plg",
  run: async (input, ctx) => {
    let q = `mimeType='${SPREADSHEET_MIME}'`;
    if (input.name_contains) {
      const escaped = input.name_contains.replace(/'/g, "''");
      q += ` and name contains '${escaped}'`;
    }

    const url = new URL(`${DRIVE_BASE}/files`);
    url.searchParams.set("q", q);
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    url.searchParams.set(
      "fields",
      "nextPageToken,files(id,name,modifiedTime,webViewLink)",
    );
    url.searchParams.set("pageSize", String(input.limit));
    if (input.page_token) url.searchParams.set("pageToken", input.page_token);
    if (input.drive_id) {
      url.searchParams.set("corpora", "drive");
      url.searchParams.set("driveId", input.drive_id);
    }

    const res = await googleSheetsFetch(ctx.fetch, url.toString(), {
      method: "GET",
    });
    const data = (await res.json()) as {
      nextPageToken?: string;
      files?: {
        id?: string;
        name?: string;
        modifiedTime?: string;
        webViewLink?: string;
      }[];
    };

    return {
      spreadsheets: (data.files ?? []).map((f) => ({
        spreadsheet_id: f.id ?? "",
        name: f.name ?? "",
        modified_time: f.modifiedTime ?? "",
        web_view_link: f.webViewLink ?? "",
      })),
      next_page_token: data.nextPageToken ?? null,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
