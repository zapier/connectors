#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  throwGraphError,
  withQuery,
} from "../lib/microsoft-onedrive.ts";

const inputSchema = z
  .object({
    itemId: z
      .string()
      .describe(
        "File id to export. Resolve via findFiles / findItemsByKql / listFolderItems.",
      ),
    driveId: z
      .string()
      .describe("Drive id from listDrives. Omit for the caller's own OneDrive.")
      .optional(),
    format: z
      .enum(["pdf", "html", "jpg"])
      .describe(
        "Target format to convert to. pdf accepts Office document sources (doc/docx/xls/xlsx/ppt/pptx and more); not all source types convert to every format.",
      ),
    height: z
      .number()
      .int()
      .describe(
        "Output image height in pixels. Required when format is jpg; ignored otherwise.",
      )
      .optional(),
    width: z
      .number()
      .int()
      .describe(
        "Output image width in pixels. Required when format is jpg; ignored otherwise.",
      )
      .optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (
      val.format === "jpg" &&
      (val.height === undefined || val.width === undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "height and width are both required when format is jpg.",
      });
    }
  });

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
    "Export a file converted to PDF, HTML, or JPG; returns a short-lived pre-authenticated download URL. Not all source types convert to every format. When format is jpg, height and width are required. Pass driveId to target a specific drive (omit for the caller's own).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-onedrive",
  run: async (input, ctx) => {
    const url = withQuery(
      `${driveBase(input.driveId)}/items/${encodeURIComponent(input.itemId)}/content`,
      {
        format: input.format,
        height: input.format === "jpg" ? input.height : undefined,
        width: input.format === "jpg" ? input.width : undefined,
      },
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
      // requested format) — surface it with the shared OneDrive hints.
      await throwGraphError(res);
    }
    return { id: input.itemId, format: input.format, downloadUrl };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
