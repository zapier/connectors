#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  driveItemSchema,
  graphFetch,
} from "../lib/microsoft-onedrive.ts";

const inputSchema = z
  .object({
    itemId: z
      .string()
      .describe(
        "File or folder id. Resolve via findFiles / findItemsByKql / listFolderItems.",
      ),
    driveId: z
      .string()
      .describe(
        "Drive id from listDrives, or a shared item's remoteItem.parentReference.driveId. Omit for the caller's own OneDrive.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "getItem",
  title: "Get Item",
  description:
    "Retrieve a file or folder's metadata by id, including a short-lived download URL for files. This is the download path for existing files. Pass driveId to target a specific drive (omit for the caller's own).",
  inputSchema,
  outputSchema: driveItemSchema.describe("The file or folder."),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-onedrive",
  run: async (input, ctx) => {
    const url = `${driveBase(input.driveId)}/items/${encodeURIComponent(input.itemId)}`;
    const res = await graphFetch(ctx.fetch, url);
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
