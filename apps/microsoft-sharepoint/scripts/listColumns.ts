#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH, graphFetch, unwrapList } from "../lib/microsoft-sharepoint.ts";

const inputSchema = z
  .object({
    siteId: z.string().describe("Site id from findSites."),
    listId: z.string().describe("List id from listLists."),
  })
  .strict();

// The opaque per-type facets — presence signals the column's type; their inner
// settings vary per type and are passed through as-is.
const typeFacet = z
  .record(z.string(), z.json())
  .describe("Present when the column is of this type; carries its settings.")
  .optional();

const columnSchema = z.object({
  id: z.string().describe("Column id.").optional(),
  name: z
    .string()
    .describe("Internal column name — the key used in the fields object."),
  displayName: z.string().describe("Human label shown in the UI.").optional(),
  columnGroup: z.string().describe("Column group.").optional(),
  readOnly: z
    .boolean()
    .describe(
      "Whether the column is read-only (not writable via list-item tools).",
    )
    .optional(),
  required: z
    .boolean()
    .describe("Whether the column is required on the list.")
    .optional(),
  hidden: z.boolean().describe("Whether the column is hidden.").optional(),
  text: typeFacet,
  number: typeFacet,
  boolean: typeFacet,
  dateTime: typeFacet,
  choice: z
    .object({
      choices: z
        .array(z.string())
        .describe("Allowed values for this choice column.")
        .optional(),
    })
    .describe("Present when the column is a choice column.")
    .optional(),
  lookup: typeFacet,
  personOrGroup: typeFacet,
  currency: typeFacet,
});

const outputSchema = z.object({
  items: z.array(columnSchema).describe("The list's column definitions."),
});

const definition = defineTool({
  name: "listColumns",
  title: "List Columns",
  description:
    "List a list's columns, including the internal names that key the fields object on list-item reads and writes. Use this before creating or updating list items to learn valid field keys and types.",
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
    const url = `${GRAPH}/sites/${encodeURIComponent(input.siteId)}/lists/${encodeURIComponent(input.listId)}/columns`;
    const res = await graphFetch(ctx.fetch, url);
    // The columns collection isn't paged (no cursor); unwrap `value` → `items`
    // and drop the (always-absent) next_cursor.
    const { items } = unwrapList(await res.json());
    return { items };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
