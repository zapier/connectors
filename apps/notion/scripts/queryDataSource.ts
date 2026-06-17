#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";
import { normalizeNotionId } from "../lib/notionId.ts";
import { sortInput } from "../lib/notionSchemas.ts";

const inputSchema = z
  .object({
    data_source_id: z
      .string()
      .describe(
        "The data source id (a UUID with or without dashes, or a pasted Notion URL). Get it from getDatabase (data_sources[].id) or search (filter data_source).",
      ),
    filter: z
      .record(z.string(), z.json())
      .describe(
        "Filter conditions. Single property condition or compound { and [...] } / { or [...] }. Operators are property-type-specific. See references/notion-query.md.",
      )
      .optional(),
    sorts: z
      .array(sortInput)
      .describe(
        'Sort order, applied in array order. Each entry is { "property": "<name>", "direction": "ascending" } or { "timestamp": "last_edited_time", "direction": "descending" }.',
      )
      .optional(),
    start_cursor: z
      .string()
      .describe("Pagination cursor from a previous response's next_cursor.")
      .optional(),
    page_size: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Results per page (max 100). Defaults to 10 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  object: z.literal("list"),
  results: z
    .array(
      z
        .object({
          object: z.literal("page"),
          id: z.string().describe("The page id."),
          url: z.string().describe("The page URL in the Notion app."),
          created_time: z.string().datetime({ offset: true }).optional(),
          last_edited_time: z.string().datetime({ offset: true }).optional(),
          in_trash: z
            .boolean()
            .describe("True if the page is in the trash.")
            .optional(),
          parent: z
            .record(z.string(), z.json())
            .describe("The container this row belongs to (a data source)."),
          properties: z
            .record(z.string(), z.json())
            .describe(
              "Property values keyed by property name. Shapes are type-specific. See references/notion-properties.md.",
            )
            .optional(),
          icon: z.record(z.string(), z.json()).nullable().optional(),
          cover: z.record(z.string(), z.json()).nullable().optional(),
        })
        .describe(
          "A Notion page (a standalone page or a row in a data source).",
        ),
    )
    .describe("Matching rows (pages)."),
  next_cursor: z.union([z.string(), z.null()]).optional(),
  has_more: z.boolean(),
});

const definition = defineTool({
  name: "queryDataSource",
  title: "Query Data Source",
  description:
    "Query the rows (pages) of a data source with optional filter and sorts. Filter/sort property keys and operators depend on each property's type — discover them via getDataSource. Returns one page of rows; paginate via next_cursor (Notion caps a query at 10,000 total results).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "notion",
  run: async (input, ctx) => {
    const url = `https://api.notion.com/v1/data_sources/${encodeURIComponent(normalizeNotionId(input.data_source_id))}/query`;
    const body: Record<string, unknown> = {};
    if (input.filter !== undefined) body["filter"] = input.filter;
    if (input.sorts !== undefined) body["sorts"] = input.sorts;
    if (input.start_cursor !== undefined)
      body["start_cursor"] = input.start_cursor;
    body["page_size"] = input.page_size ?? 10;
    const res = await notionFetch(ctx.fetch, url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
