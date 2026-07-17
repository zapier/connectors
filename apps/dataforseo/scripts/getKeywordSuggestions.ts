#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive, flattenKeywordRow } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    keyword: z.string().describe("Seed keyword to expand."),
    location_name: z
      .string()
      .describe(
        'Full location name, e.g. "United States". See listLocationsAndLanguages.',
      ),
    language_name: z
      .string()
      .describe(
        'Full language name, e.g. "English". See listLocationsAndLanguages.',
      ),
    include_seed_keyword: z
      .boolean()
      .describe("Include metrics for the seed keyword itself.")
      .optional(),
    ignore_synonyms: z
      .boolean()
      .describe("Exclude highly similar synonym variations.")
      .optional(),
    filters: z
      .string()
      .describe(
        'Optional filter as a DataForSEO array-expression, e.g. \'["keyword_info.search_volume",">",100]\'. See the api-gotchas reference.',
      )
      .optional(),
    order_by: z
      .string()
      .describe(
        'Optional sort as "field,direction", e.g. "keyword_info.search_volume,desc".',
      )
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Max results to return (up to 1000). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    offset: z
      .number()
      .int()
      .describe("Number of results to skip for paging.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items_count: z.number().int().describe("Number of keywords returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        keyword: z
          .string()
          .nullable()
          .describe("The suggested keyword.")
          .optional(),
        search_volume: z
          .number()
          .int()
          .nullable()
          .describe("Average monthly searches.")
          .optional(),
        cpc: z
          .number()
          .nullable()
          .describe("Average cost-per-click in USD.")
          .optional(),
        competition: z
          .number()
          .nullable()
          .describe("Paid competition index")
          .optional(),
        keyword_difficulty: z
          .number()
          .int()
          .nullable()
          .describe("Organic ranking difficulty")
          .optional(),
      }),
    )
    .nullable()
    .describe("Suggested keywords.")
    .optional(),
});

const definition = defineTool({
  name: "getKeywordSuggestions",
  title: "Get Keyword Suggestions",
  description:
    "Get long-tail search queries that include a seed keyword, with volume and competition. Use to expand a topic into related queries.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "dataforseo",
  run: async (input, ctx) => {
    const params: Record<string, unknown> = {};
    if (input.keyword !== undefined) params["keyword"] = input.keyword;
    if (input.location_name !== undefined)
      params["location_name"] = input.location_name;
    if (input.language_name !== undefined)
      params["language_name"] = input.language_name;
    if (input.include_seed_keyword !== undefined)
      params["include_seed_keyword"] = input.include_seed_keyword;
    if (input.ignore_synonyms !== undefined)
      params["ignore_synonyms"] = input.ignore_synonyms;
    if (input.filters !== undefined) params["filters"] = input.filters;
    if (input.order_by !== undefined) params["order_by"] = input.order_by;
    params["limit"] = input.limit ?? 20;
    if (input.offset !== undefined) params["offset"] = input.offset;
    const result = await dataforseoLive(
      ctx.fetch,
      "/v3/dataforseo_labs/google/keyword_suggestions/live",
      params,
      "DataForSEO getKeywordSuggestions",
    );
    return { ...result, items: result.items.map(flattenKeywordRow) };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
