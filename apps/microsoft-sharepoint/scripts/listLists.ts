#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH,
  graphFetch,
  listUrl,
  sharePointListSchema,
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
        "Maximum lists to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe("Pagination cursor from a previous response's next_cursor.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z.array(sharePointListSchema).describe("The site's lists."),
  next_cursor: z
    .string()
    .describe("Cursor for the next page; absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listLists",
  title: "List Lists",
  description:
    "List the lists in a site to resolve a listId, or to look up a single list's details. Each list includes its metadata; list.template distinguishes generic lists from document libraries.",
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
    // List tool: `limit` maps to OData `$top`, `cursor` is the opaque
    // @odata.nextLink, and the `{ value, @odata.nextLink }` envelope unwraps to
    // `{ items, next_cursor }`.
    const url = listUrl(
      `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/lists`,
      input,
    );
    const res = await graphFetch(ctx.fetch, url);
    return unwrapList(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
