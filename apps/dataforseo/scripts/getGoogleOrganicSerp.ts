#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    keyword: z.string().describe("Search query to look up."),
    location_name: z
      .string()
      .describe(
        'Full location name as DataForSEO lists it, e.g. "United States" or "London,England,United Kingdom". Call listLocationsAndLanguages for exact names.',
      ),
    language_name: z
      .string()
      .describe(
        'Full language name as DataForSEO lists it, e.g. "English". Call listLocationsAndLanguages for exact names.',
      ),
    device: z
      .string()
      .describe('"desktop" or "mobile". Defaults to desktop.')
      .optional(),
    se_domain: z
      .string()
      .describe('Google domain to query, e.g. "google.com", "google.co.uk".')
      .optional(),
    depth: z
      .number()
      .int()
      .describe("Number of results to parse (multiples of 10).")
      .optional(),
    target: z
      .string()
      .describe('Optional domain to restrict results to, e.g. "example.com".')
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items_count: z.number().int().describe("Number of SERP items returned."),
  cost: z
    .number()
    .nullable()
    .describe("Credit cost of this request, in USD.")
    .optional(),
  items: z
    .array(
      z.object({
        type: z
          .string()
          .nullable()
          .describe(
            'SERP item type, e.g. "organic", "featured_snippet", "people_also_ask".',
          )
          .optional(),
        rank_absolute: z
          .number()
          .int()
          .nullable()
          .describe("Absolute position across all SERP elements.")
          .optional(),
        rank_group: z
          .number()
          .int()
          .nullable()
          .describe("Position within this item type.")
          .optional(),
        title: z.string().nullable().describe("Result title.").optional(),
        url: z.string().nullable().describe("Result URL.").optional(),
        domain: z.string().nullable().describe("Result domain.").optional(),
        description: z
          .string()
          .nullable()
          .describe("Result snippet.")
          .optional(),
      }),
    )
    .nullable()
    .describe("SERP items in rank order.")
    .optional(),
});

const definition = defineTool({
  name: "getGoogleOrganicSerp",
  title: "Get Google Organic Serp",
  description:
    "Fetch live parsed Google organic results for a keyword in a location and language. Use to see who ranks and which SERP features appear.",
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
    if (input.device !== undefined) params["device"] = input.device;
    if (input.se_domain !== undefined) params["se_domain"] = input.se_domain;
    if (input.depth !== undefined) params["depth"] = input.depth;
    if (input.target !== undefined) params["target"] = input.target;
    return dataforseoLive(
      ctx.fetch,
      "/v3/serp/google/organic/live/advanced",
      params,
      "DataForSEO getGoogleOrganicSerp",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
