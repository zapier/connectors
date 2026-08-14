#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  graphFetch,
  listUrl,
  permissionSchema,
  unwrapList,
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
      .describe("Drive id from listDrives. Omit for the caller's own OneDrive.")
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Maximum permissions to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe("Pagination cursor from a previous response's next_cursor.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z.array(permissionSchema).describe("The item's sharing permissions."),
  next_cursor: z
    .string()
    .describe("Cursor for the next page; absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listItemPermissions",
  title: "List Item Permissions",
  description:
    "List the sharing permissions on a file or folder. Returns each permissionId for removeItemPermission. Pass driveId to target a specific drive (omit for the caller's own). Non-owners see only permissions that apply to them.",
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
    const url = listUrl(
      `${driveBase(input.driveId)}/items/${encodeURIComponent(input.itemId)}/permissions`,
      input,
    );
    const res = await graphFetch(ctx.fetch, url);
    return unwrapList(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
