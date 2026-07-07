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
  name: "deletePage",
  title: "Delete Page",
  description:
    "Delete a site page by id, moving it to the recycle bin (recoverable by a user in SharePoint). Resolve the pageId via listPages.",
  inputSchema,
  outputSchema: successSchema,
  annotations: {
    readOnlyHint: false,
    // Destructive from the agent's side: no restore tool here, so the connector
    // can't undo it (the recycle bin is a user-side recovery). A client should
    // confirm before deleting.
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    // Delete addresses the page at the baseSitePage level — NO cast segment,
    // unlike get/list/publish.
    const url = `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/pages/${encodeURIComponent(input.pageId)}`;
    // 204, no body — synthesize the success shape.
    await graphFetch(ctx.fetch, url, { method: "DELETE" });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
