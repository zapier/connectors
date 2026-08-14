#!/usr/bin/env node
// Replacing a file's contents is the same 3-step resumable-upload composition
// as uploadFile (download → open session → PUT bytes with no auth header),
// addressed at an existing item id so it keeps that id (and its sharing links).
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  driveItemSchema,
  uploadToSession,
} from "../lib/microsoft-onedrive.ts";

const inputSchema = z
  .object({
    itemId: z
      .string()
      .describe(
        "Id of the existing file to replace. Resolve via findFiles / findItemsByKql / listFolderItems.",
      ),
    driveId: z
      .string()
      .describe("Drive id from listDrives. Omit for the caller's own OneDrive.")
      .optional(),
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
    "Replace the contents of an existing file with bytes from a source URL, keeping the same item id (and its sharing links). Uses a resumable upload session. Resolve the target itemId via getItem or findFiles first.",
  inputSchema,
  outputSchema: driveItemSchema.describe("The updated file."),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-onedrive",
  run: async (input, ctx) => {
    // 1. Fetch the new bytes with a bare fetch — the fileUrl is an arbitrary
    // caller-provided host, so OneDrive credentials must NOT be sent to it.
    const src = await globalThis.fetch(input.fileUrl);
    if (!src.ok) {
      throw new Error(
        `Microsoft OneDrive replaceFile: could not download source from fileUrl (HTTP ${src.status}).`,
      );
    }
    const bytes = new Uint8Array(await src.arrayBuffer());

    // 2. Open the session against the existing item and stream the bytes.
    // replace keeps the item id (content update in place).
    const sessionUrl = `${driveBase(input.driveId)}/items/${encodeURIComponent(input.itemId)}/createUploadSession`;
    return uploadToSession(ctx.fetch, sessionUrl, bytes, "replace");
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
