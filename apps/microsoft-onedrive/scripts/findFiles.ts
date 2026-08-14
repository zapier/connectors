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
    search: z
      .string()
      .describe("Query matched against file/folder name and indexed content."),
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
  items: z.array(driveItemSchema).describe("Matching files and folders."),
  next_cursor: z
    .string()
    .describe("Cursor for the next page; absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "findFiles",
  title: "Find Files",
  description:
    "Search files and folders by name or indexed content within one drive, recursively from the root. To search shared content too, use findItemsByKql. Pass driveId to target a specific drive (omit for the caller's own). Newly created items may lag the search index.",
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
    // Graph search is a function-call path segment (the query lives in the
    // path, not a query param), so the search term is baked into the base URL
    // and listUrl only adds $top / follows the opaque nextLink cursor.
    const searchUrl = `${driveBase(input.driveId)}/root/search(q='${encodeURIComponent(input.search)}')`;
    const url = listUrl(searchUrl, input);
    const res = await graphFetch(ctx.fetch, url);
    return unwrapList(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
