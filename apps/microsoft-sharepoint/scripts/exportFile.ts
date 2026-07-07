#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  throwGraphError,
  withQuery,
} from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    driveId: z
      .string()
      .describe(
        "Document library id from listDrives. Omit for the site's default library.",
      )
      .optional(),
    itemId: z.string().describe("File id to export."),
    format: z
      .enum(["pdf", "html", "jpg", "glb"])
      .describe(
        "Target format to convert to. pdf accepts Office document sources (doc/docx/xls/xlsx/ppt/pptx and more); not all source types convert to every format.",
      ),
  })
  .strict();

const outputSchema = z.object({
  id: z.string().describe("Source file id."),
  format: z.string().describe("Export format used."),
  downloadUrl: z
    .string()
    .describe(
      "Pre-authenticated URL to fetch the converted file (no auth header needed).",
    ),
});

const definition = defineTool({
  name: "exportFile",
  title: "Export File",
  description:
    "Export a file converted to another format (e.g. Office documents to PDF); returns a short-lived pre-authenticated download URL. Not all source types convert to every format. Pass driveId to target a library (omit for default).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    const url = withQuery(
      `${driveBase(input.siteId, input.driveId)}/items/${encodeURIComponent(input.itemId)}/content`,
      { format: input.format },
    );
    // Graph answers /content?format= with a 302 to a pre-authenticated download
    // URL. graphFetch throws on non-2xx, so fetch directly with redirect:manual
    // to capture the Location rather than following it.
    const res = await ctx.fetch(url, { redirect: "manual" });
    // 302 carries the URL in Location; if the runtime already followed the
    // redirect, res.url is the final (pre-authenticated) URL.
    const downloadUrl =
      res.headers.get("Location") ?? (res.ok ? res.url : undefined);
    if (!downloadUrl) {
      // A genuine failure (e.g. 403/404, or a type that won't convert to the
      // requested format) — surface it with the shared SharePoint hints.
      await throwGraphError(res);
    }
    return { id: input.itemId, format: input.format, downloadUrl };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
