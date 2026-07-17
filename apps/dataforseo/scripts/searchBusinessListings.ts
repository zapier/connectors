#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    categories: z
      .array(z.string())
      .describe('Google Maps categories to match, e.g. ["restaurant"].')
      .optional(),
    title: z.string().describe("Business name text to match.").optional(),
    description: z.string().describe("Description text to match.").optional(),
    is_claimed: z
      .boolean()
      .describe("Only listings that are (or aren't) claimed by their owner.")
      .optional(),
    location_coordinate: z
      .string()
      .describe('Center as "lat,lng,radius_km", e.g. "53.47,-2.29,10".')
      .optional(),
    filters: z
      .string()
      .describe(
        "Optional filter as a DataForSEO array-expression. See the api-gotchas reference.",
      )
      .optional(),
    order_by: z
      .string()
      .describe('Optional sort as "field,direction".')
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
  items_count: z.number().int().describe("Number of listings returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        title: z.string().nullable().describe("Business name.").optional(),
        category: z
          .string()
          .nullable()
          .describe("Primary category.")
          .optional(),
        address: z
          .string()
          .nullable()
          .describe("Formatted address.")
          .optional(),
        phone: z.string().nullable().describe("Phone number.").optional(),
        url: z.string().nullable().describe("Website URL.").optional(),
        rating: z
          .json()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Business listings.")
    .optional(),
});

const definition = defineTool({
  name: "searchBusinessListings",
  title: "Search Business Listings",
  description:
    "Search businesses listed on Google Maps by category, title, or location, returning contact and rating data. Use for local-business or competitor research.",
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
    if (input.filters !== undefined) params["filters"] = input.filters;
    if (input.order_by !== undefined) params["order_by"] = input.order_by;
    params["limit"] = input.limit ?? 20;
    if (input.offset !== undefined) params["offset"] = input.offset;
    return dataforseoLive(
      ctx.fetch,
      "/v3/business_data/business_listings/search/live",
      params,
      "DataForSEO searchBusinessListings",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
