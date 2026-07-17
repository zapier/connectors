#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive, flattenKeywordRow } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    keywords: z.array(z.string()).describe("Keywords to look up (up to 700)."),
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
    include_serp_info: z
      .boolean()
      .describe("Include SERP metadata for each keyword.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items_count: z.number().int().describe("Number of keywords returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        keyword: z.string().nullable().describe("The keyword.").optional(),
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
        search_intent: z
          .string()
          .nullable()
          .describe(
            "Dominant intent: informational, navigational, commercial, or transactional.",
          )
          .optional(),
      }),
    )
    .nullable()
    .describe("Keyword metrics.")
    .optional(),
});

const definition = defineTool({
  name: "getKeywordOverview",
  title: "Get Keyword Overview",
  description:
    "Get full metrics (volume, CPC, competition, difficulty, intent) for a specific list of keywords you already have. Use when you know the keywords and want their stats.",
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
    if (input.keywords !== undefined) params["keywords"] = input.keywords;
    if (input.location_name !== undefined)
      params["location_name"] = input.location_name;
    if (input.language_name !== undefined)
      params["language_name"] = input.language_name;
    if (input.include_serp_info !== undefined)
      params["include_serp_info"] = input.include_serp_info;
    const result = await dataforseoLive(
      ctx.fetch,
      "/v3/dataforseo_labs/google/keyword_overview/live",
      params,
      "DataForSEO getKeywordOverview",
    );
    return { ...result, items: result.items.map(flattenKeywordRow) };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
