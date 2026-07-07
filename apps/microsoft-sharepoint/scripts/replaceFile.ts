#!/usr/bin/env node
// Replacing a file's contents is the same 3-step resumable-upload composition
// as uploadFile (download → open session → PUT bytes with no auth header),
// addressed at an existing item id so it keeps that id.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  driveItemSchema,
  uploadToSession,
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
    itemId: z
      .string()
      .describe(
        "Id of the existing file to replace (from getItem / findFiles).",
      ),
    fileUrl: z
      .string()
      .url()
      .describe("URL the connector downloads the new file contents from."),
  })
  .strict();

const definition = defineTool({
  name: "replaceFile",
  title: "Replace File",
  description:
    "Replace the contents of an existing file with bytes from a source URL, keeping the same item id. Uses a resumable upload session. Resolve the target itemId via getItem or findFiles first.",
  inputSchema,
  outputSchema: driveItemSchema.describe("The updated file."),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    // 1. Fetch the new bytes (unauthenticated — an arbitrary source URL).
    const src = await globalThis.fetch(input.fileUrl);
    if (!src.ok) {
      throw new Error(
        `Microsoft SharePoint replaceFile: could not download source from fileUrl (HTTP ${src.status}).`,
      );
    }
    const bytes = new Uint8Array(await src.arrayBuffer());

    // 2. Open the session against the existing item and stream the bytes.
    // replace keeps the item id (content update in place).
    const sessionUrl = `${driveBase(input.siteId, input.driveId)}/items/${encodeURIComponent(input.itemId)}/createUploadSession`;
    return uploadToSession(ctx.fetch, sessionUrl, bytes, "replace");
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
