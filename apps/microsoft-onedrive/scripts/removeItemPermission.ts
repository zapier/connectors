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
        "File or folder id. Resolve via findFiles / findItemsByKql / listFolderItems.",
      ),
    permissionId: z
      .string()
      .describe("Permission id from listItemPermissions."),
    driveId: z
      .string()
      .describe("Drive id from listDrives. Omit for the caller's own OneDrive.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "removeItemPermission",
  title: "Remove Item Permission",
  description:
    "Revoke a sharing permission from a file or folder. Reversible by re-inviting. Only non-inherited permissions can be removed. Resolve the permissionId via listItemPermissions; pass driveId to target a specific drive (omit for the caller's own).",
  inputSchema,
  outputSchema: successSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-onedrive",
  run: async (input, ctx) => {
    const url = `${driveBase(input.driveId)}/items/${encodeURIComponent(input.itemId)}/permissions/${encodeURIComponent(input.permissionId)}`;
    await graphFetch(ctx.fetch, url, { method: "DELETE" });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
