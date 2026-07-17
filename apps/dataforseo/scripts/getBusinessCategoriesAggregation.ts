#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    categories: z
      .array(z.string())
      .describe("Categories to aggregate within.")
      .optional(),
    title: z.string().describe("Business name text to match.").optional(),
    description: z.string().describe("Description text to match.").optional(),
    is_claimed: z
      .boolean()
      .describe("Restrict to claimed/unclaimed listings.")
      .optional(),
    location_coordinate: z
      .string()
      .describe('Center as "lat,lng,radius_km".')
      .optional(),
    internal_list_limit: z
      .number()
      .int()
      .describe("Max items within each aggregation bucket (up to 1000).")
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Max buckets to return (up to 1000). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    offset: z
      .number()
      .int()
      .describe("Number of buckets to skip for paging.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items_count: z.number().int().describe("Number of categories returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        category: z
          .string()
          .nullable()
          .describe("Business category.")
          .optional(),
        count: z
          .number()
          .int()
          .nullable()
          .describe("Number of listings in this category.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Category aggregation buckets.")
    .optional(),
});

const definition = defineTool({
  name: "getBusinessCategoriesAggregation",
  title: "Get Business Categories Aggregation",
  description:
    "Get counts of Google Maps businesses grouped by category, for a location or filter. Use to size a local market by category.",
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
    if (input.categories !== undefined) params["categories"] = input.categories;
    if (input.title !== undefined) params["title"] = input.title;
    if (input.description !== undefined)
      params["description"] = input.description;
    if (input.is_claimed !== undefined) params["is_claimed"] = input.is_claimed;
    if (input.location_coordinate !== undefined)
      params["location_coordinate"] = input.location_coordinate;
    if (input.internal_list_limit !== undefined)
      params["internal_list_limit"] = input.internal_list_limit;
    params["limit"] = input.limit ?? 20;
    if (input.offset !== undefined) params["offset"] = input.offset;
    const result = await dataforseoLive(
      ctx.fetch,
      "/v3/business_data/business_listings/categories_aggregation/live",
      params,
      "DataForSEO getBusinessCategoriesAggregation",
    );
    // The API returns per-category counts as a `aggregation.top_categories` map
    // ({ "<category>": <count> }); explode it into one { category, count } row.
    const topCategories =
      (
        result.items[0] as
          | { aggregation?: { top_categories?: Record<string, number> } }
          | undefined
      )?.aggregation?.top_categories ?? {};
    const rows = Object.entries(topCategories).map(([category, count]) => ({
      category,
      count,
    }));
    return { items: rows, items_count: rows.length, cost: result.cost };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
