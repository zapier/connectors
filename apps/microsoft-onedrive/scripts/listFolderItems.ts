#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  driveBase,
  driveItemSchema,
  graphFetch,
  listUrl,
  unwrapList,
} from "../lib/microsoft-onedrive.ts";

const inputSchema = z
  .object({
    driveId: z
      .string()
      .describe("Drive id from listDrives. Omit for the caller's own OneDrive.")
      .optional(),
    itemId: z
      .string()
      .describe(
        "Folder id to list. Omit to list the drive root. Resolve via findFiles / findItemsByKql / listFolderItems.",
      )
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Maximum items to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe("Pagination cursor from a previous response's next_cursor.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z
    .array(driveItemSchema)
    .describe("The folder's files and subfolders."),
  next_cursor: z
    .string()
    .describe("Cursor for the next page; absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listFolderItems",
  title: "List Folder Items",
  description:
    "List the files and subfolders directly inside a folder, or the drive root. Pass itemId to target a folder (omit for the root), and driveId to target a specific drive (omit for the caller's own OneDrive).",
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
    // Root vs. nested: with an itemId address that folder's children;
    // without one, the drive root's children collection.
    const path = input.itemId
      ? `items/${encodeURIComponent(input.itemId)}/children`
      : "root/children";
    const url = listUrl(`${driveBase(input.driveId)}/${path}`, input);
    const res = await graphFetch(ctx.fetch, url);
    return unwrapList(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
