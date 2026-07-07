#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH,
  graphFetch,
  successSchema,
} from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    pageId: z.string().describe("Page id from listPages."),
  })
  .strict();

const definition = defineTool({
  name: "publishPage",
  title: "Publish Page",
  description:
    "Publish a draft page, making it visible to site visitors. If a page-approval flow is active, publish waits on approval.",
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
    // The /microsoft.graph.sitePage cast segment is required before /publish.
    const url = `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/pages/${encodeURIComponent(input.pageId)}/microsoft.graph.sitePage/publish`;
    // 204, no body — synthesize the success shape.
    await graphFetch(ctx.fetch, url, { method: "POST" });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
