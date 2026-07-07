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
    listId: z.string().describe("List id from listLists."),
    itemId: z.string().describe("List item id to delete."),
  })
  .strict();

const outputSchema = successSchema;

const definition = defineTool({
  name: "deleteListItem",
  title: "Delete List Item",
  description:
    "Delete an item from a list by id (resolve the itemId via findListItems / getListItem). Removes the item from the list; unlike file deletion, the API doesn't document a recycle-bin restore path for list items.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-sharepoint",
  run: async (input, ctx) => {
    const url = `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/items/${encodeURIComponent(input.itemId)}`;
    await graphFetch(ctx.fetch, url, { method: "DELETE" });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
