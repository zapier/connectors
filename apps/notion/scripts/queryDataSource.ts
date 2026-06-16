#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";
import { normalizeNotionId } from "../lib/notionId.ts";

const inputSchema = z
  .object({
    data_source_id: z
      .string()
      .describe(
        "The data source id (UUID). Get it from getDatabase (data_sources[].id) or search (filter data_source).",
      ),
    filter: z
      .record(z.string(), z.any())
      .describe(
        "Filter conditions. Single property condition or compound { and [...] } / { or [...] }. Operators are property-type-specific. See references/notion-query.md.",
      )
      .optional(),
    sorts: z
      .array(z.record(z.string(), z.any()))
      .describe(
        "Sort order. Each entry is { property, direction } or { timestamp, direction }.",
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
  object: z.string().describe('Always "list".'),
  results: z
    .array(
      z
        .object({
          object: z.string().describe('Always "page".'),
          id: z.string().describe("The page id (UUID)."),
          url: z.string().describe("The page URL in the Notion app."),
          created_time: z.string().datetime({ offset: true }).optional(),
          last_edited_time: z.string().datetime({ offset: true }).optional(),
          in_trash: z
            .boolean()
            .describe("True if the page is in the trash.")
            .optional(),
          parent: z
            .any()
            .describe("Nested Parent object — shape passes through."),
          properties: z
            .any()
            .describe("Nested object — shape passes through.")
            .optional(),
          icon: z
            .any()
            .describe("Nested object — shape passes through.")
            .optional(),
          cover: z
            .any()
            .describe("Nested object — shape passes through.")
            .optional(),
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
    const res = await notionFetch(ctx.fetch, "queryDataSource", url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
