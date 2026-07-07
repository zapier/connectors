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
    driveId: z
      .string()
      .describe(
        "Document library id from listDrives. Omit for the site's default library.",
      )
      .optional(),
    itemId: z.string().describe("File or folder id to move/rename."),
    parentItemId: z
      .string()
      .describe(
        "Destination folder id in the SAME library (from listFolderItems / getItem). Omit to keep the current folder.",
      )
      .optional(),
    newName: z
      .string()
      .describe("New name for the item. Omit to keep the current name.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "moveItem",
  title: "Move Item",
  description:
    "Move an item to another folder in the SAME document library, and/or rename it. Cross-library/site moves aren't supported — copy then delete instead. Set at least one of parentItemId or newName.",
  inputSchema,
  outputSchema: driveItemSchema.describe("The moved/renamed item."),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    // A move sets parentReference.id; a rename sets name. Send only what's
    // provided so a rename-only call doesn't clear the parent (and vice versa).
    const body = {
      ...(input.parentItemId
        ? { parentReference: { id: input.parentItemId } }
        : {}),
      ...(input.newName ? { name: input.newName } : {}),
    };
    const url = `${driveBase(input.siteId, input.driveId)}/items/${encodeURIComponent(input.itemId)}`;
    const res = await graphFetch(ctx.fetch, url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
