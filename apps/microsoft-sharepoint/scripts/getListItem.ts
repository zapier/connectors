#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH,
  graphFetch,
  listItemSchema,
  withQuery,
} from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    listId: z.string().describe("List id from listLists."),
    itemId: z.string().describe("List item id."),
    columns: z
      .array(z.string())
      .describe(
        "Column internal names to include (from listColumns). Required to get lookup, person, and group column values — otherwise they return only as {Field}LookupId, a numeric id. Max 12 lookup columns.",
      )
      .optional(),
  })
  .strict();

const outputSchema = listItemSchema;

const definition = defineTool({
  name: "getListItem",
  title: "Get List Item",
  description:
    "Retrieve a single list item with column values expanded. Use the columns input to surface lookup/person values (else they return as {Field}LookupId).",
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
    // Fields are only returned when explicitly expanded. Selecting specific
    // columns (fields($select=...)) is also what surfaces lookup/person values
    // instead of a bare {Field}LookupId, so map `columns` into the expand.
    const expand =
      input.columns && input.columns.length > 0
        ? `fields($select=${input.columns.join(",")})`
        : "fields";
    const url = withQuery(
      `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/items/${encodeURIComponent(input.itemId)}`,
      { $expand: expand },
    );
    const res = await graphFetch(ctx.fetch, url);
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
