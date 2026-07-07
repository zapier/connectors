#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH,
  graphFetch,
  sitePageSchema,
} from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    pageId: z.string().describe("Page id from listPages."),
  })
  .strict();

const definition = defineTool({
  name: "getPage",
  title: "Get Page",
  description:
    "Retrieve a site page's metadata by id (resolve the id via listPages). Requires the microsoft.graph.sitePage type-cast segment (baked into the path). Returns page metadata; page body content is not surfaced.",
  inputSchema,
  outputSchema: sitePageSchema.describe("The site page."),
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    // The /microsoft.graph.sitePage cast segment is required to read a page off
    // the baseSitePage-typed collection.
    const url = `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/pages/${encodeURIComponent(input.pageId)}/microsoft.graph.sitePage`;
    const res = await graphFetch(ctx.fetch, url);
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
