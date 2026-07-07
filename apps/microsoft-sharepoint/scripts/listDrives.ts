#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH,
  graphFetch,
  listUrl,
  unwrapList,
} from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Maximum drives to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe("Pagination cursor from a previous response's next_cursor.")
      .optional(),
  })
  .strict();

const driveSchema = z.object({
  id: z.string().describe("Drive (document library) id."),
  name: z.string().describe("Library name.").optional(),
  driveType: z
    .string()
    .describe("Drive type, e.g. documentLibrary.")
    .optional(),
  webUrl: z.string().describe("Library URL.").optional(),
  description: z.string().describe("Library description.").optional(),
});

const outputSchema = z.object({
  items: z.array(driveSchema).describe("The site's document libraries."),
  next_cursor: z
    .string()
    .describe("Cursor for the next page; absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listDrives",
  title: "List Drives",
  description:
    "List the document libraries (drives) in a site to resolve a driveId for file and folder tools. Pass the siteId from findSites.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    const url = listUrl(
      `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/drives`,
      input,
    );
    const res = await graphFetch(ctx.fetch, url);
    return unwrapList(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
