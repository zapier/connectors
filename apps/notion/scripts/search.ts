#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { notionFetch } from "../lib/notionFetch.ts";

const inputSchema = z
  .object({
    query: z
      .string()
      .describe(
        "Title text to match. Omit to return all shared pages and data sources.",
      )
      .optional(),
    filter: z
      .object({
        property: z.literal("object").describe('Always the literal "object".'),
        value: z
          .enum(["page", "data_source"])
          .describe("Return only pages or only data sources."),
      })
      .strict()
      .describe("Restrict results to one object type.")
      .optional(),
    sort: z
      .object({
        direction: z.enum(["ascending", "descending"]).optional(),
        timestamp: z.literal("last_edited_time").optional(),
      })
      .strict()
      .describe("Sort by last-edited time. Omit for relevance order.")
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
    .array(z.record(z.string(), z.json()))
    .describe("Matching pages and data sources."),
  next_cursor: z
    .union([
      z
        .string()
        .describe(
          "Pass as start_cursor to fetch the next page; null when no more.",
        ),
      z
        .null()
        .describe(
          "Pass as start_cursor to fetch the next page; null when no more.",
        ),
    ])
    .describe("Pass as start_cursor to fetch the next page; null when no more.")
    .optional(),
  has_more: z.boolean().describe("True if more results are available."),
});

const definition = defineTool({
  name: "search",
  title: "Search",
  description:
    "Search pages and data sources by title across the workspace. The primary way to resolve a name to an id before any get/query/update call. Omit query to list everything shared with the integration.",
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
    const url = `https://api.notion.com/v1/search`;
    const body: Record<string, unknown> = {};
    if (input.query !== undefined) body["query"] = input.query;
    if (input.filter !== undefined) body["filter"] = input.filter;
    if (input.sort !== undefined) body["sort"] = input.sort;
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
