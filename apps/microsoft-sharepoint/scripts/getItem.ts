#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  driveItemSchema,
  graphFetch,
} from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    itemId: z.string().describe("File or folder id."),
    driveId: z
      .string()
      .describe(
        "Document library id from listDrives. Omit for the default library.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "getItem",
  title: "Get Item",
  description:
    "Retrieve a file or folder's metadata by id, including a short-lived download URL for files. Pass driveId to target a specific library (omit for the default).",
  inputSchema,
  outputSchema: driveItemSchema.describe("The file or folder."),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    const url = `${driveBase(input.siteId, input.driveId)}/items/${encodeURIComponent(input.itemId)}`;
    const res = await graphFetch(ctx.fetch, url);
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
