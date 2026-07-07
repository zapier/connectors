#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH,
  graphFetch,
  listItemSchema,
  listUrl,
  unwrapList,
} from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    listId: z.string().describe("List id from listLists."),
    filter: z
      .string()
      .describe(
        "OData filter over columns, e.g. \"fields/Status eq 'Open'\" (use internal column names from listColumns). Omit to list all items.",
      )
      .optional(),
    columns: z
      .array(z.string())
      .describe(
        "Column internal names to include in each item's fields (from listColumns). Required to get lookup, person, and group column values — otherwise those columns return only as {Field}LookupId, a numeric id, not the value. Max 12 lookup columns.",
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
  items: z.array(listItemSchema).describe("The list's items."),
  next_cursor: z
    .string()
    .describe("Cursor for the next page; absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "findListItems",
  title: "Find List Items",
  description:
    "List or filter items in a SharePoint list, with column values expanded. Pass an OData filter (internal column names from listColumns) to search, or omit it to list all. Name lookup/person columns in the columns input to get their values instead of a bare {Field}LookupId.",
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
    const url = listUrl(
      `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/items`,
      input,
      { $expand: expand, $filter: input.filter },
    );
    // Filtering on a non-indexed column fails randomly without this Prefer
    // header (below the 5,000-item list-view threshold); set it whenever a
    // filter is present so agent-authored filters don't flake.
    const headers = input.filter
      ? { Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly" }
      : undefined;
    const res = await graphFetch(ctx.fetch, url, { headers });
    return unwrapList(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
