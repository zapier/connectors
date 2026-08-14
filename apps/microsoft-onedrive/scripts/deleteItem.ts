#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  graphFetch,
  successSchema,
} from "../lib/microsoft-onedrive.ts";

const inputSchema = z
  .object({
    itemId: z
      .string()
      .describe(
        "File or folder id to delete. Resolve via findFiles / findItemsByKql / listFolderItems.",
      ),
    driveId: z
      .string()
      .describe("Drive id from listDrives. Omit for the caller's own OneDrive.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "deleteItem",
  title: "Delete Item",
  description:
    "Delete a file or folder, moving it to the recycle bin (recoverable by a user in the OneDrive UI, not via a follow-up call here). Pass driveId to target a specific drive (omit for the caller's own).",
  inputSchema,
  outputSchema: successSchema,
  annotations: {
    readOnlyHint: false,
    // Destructive from the agent's side: the connector has no restore tool, so
    // it can't undo this. The recycle bin only makes it recoverable by a user
    // in the OneDrive UI, not via a follow-up call here — so a client should
    // confirm before deleting.
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-onedrive",
  run: async (input, ctx) => {
    const url = `${driveBase(input.driveId)}/items/${encodeURIComponent(input.itemId)}`;
    // 204 No Content — nothing to parse; synthesize the success shape.
    await graphFetch(ctx.fetch, url, { method: "DELETE" });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
