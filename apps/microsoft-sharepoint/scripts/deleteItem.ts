#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  graphFetch,
  successSchema,
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
    itemId: z.string().describe("File or folder id to delete."),
  })
  .strict();

const definition = defineTool({
  name: "deleteItem",
  title: "Delete Item",
  description:
    "Delete a file or folder, moving it to the site recycle bin (recoverable). Pass driveId to target a specific library (omit for the default).",
  inputSchema,
  outputSchema: successSchema,
  annotations: {
    readOnlyHint: false,
    // Destructive from the agent's side: the connector has no restore tool, so
    // it can't undo this. The recycle bin only makes it recoverable by a user
    // in the SharePoint UI, not via a follow-up call here — so a client should
    // confirm before deleting. (deleteListItem is a true hard delete.)
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    const url = `${driveBase(input.siteId, input.driveId)}/items/${encodeURIComponent(input.itemId)}`;
    // 204 No Content — nothing to parse; synthesize the success shape.
    await graphFetch(ctx.fetch, url, { method: "DELETE" });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
