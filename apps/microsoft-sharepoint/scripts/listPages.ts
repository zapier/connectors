#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH,
  graphFetch,
  listUrl,
  sitePageSchema,
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
        "Maximum pages to return. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe("Pagination cursor from a previous response's next_cursor.")
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z.array(sitePageSchema).describe("The site's pages."),
  next_cursor: z
    .string()
    .describe("Cursor for the next page; absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listPages",
  title: "List Pages",
  description:
    "List the pages in a site to resolve a pageId for getPage / publishPage / deletePage. Requires the microsoft.graph.sitePage type-cast segment (baked into the path).",
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
    // The pages collection is typed baseSitePage; the /microsoft.graph.sitePage
    // cast segment is required and already baked into the base URL — don't
    // double-add it. `limit`→$top and `cursor`→opaque @odata.nextLink.
    const url = listUrl(
      `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/pages/microsoft.graph.sitePage`,
      input,
    );
    const res = await graphFetch(ctx.fetch, url);
    return unwrapList(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
