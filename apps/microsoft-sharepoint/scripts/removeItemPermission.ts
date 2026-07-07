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
    itemId: z.string().describe("File or folder id."),
    permissionId: z
      .string()
      .describe("Permission id from listItemPermissions."),
  })
  .strict();

const definition = defineTool({
  name: "removeItemPermission",
  title: "Remove Item Permission",
  description:
    "Revoke a sharing permission from a file or folder. Reversible by re-inviting. Only non-inherited permissions can be removed. Resolve the permissionId via listItemPermissions; pass driveId to target a specific library (omit for the site's default).",
  inputSchema,
  outputSchema: successSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    const url = `${driveBase(input.siteId, input.driveId)}/items/${encodeURIComponent(input.itemId)}/permissions/${encodeURIComponent(input.permissionId)}`;
    await graphFetch(ctx.fetch, url, { method: "DELETE" });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
