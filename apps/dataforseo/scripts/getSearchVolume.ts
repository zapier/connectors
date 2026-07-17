#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    keywords: z
      .array(z.string())
      .describe("Keywords to look up (up to 1,000)."),
    location_name: z
      .string()
      .describe(
        'Full location name, e.g. "United States". This tool sends "United States" if you omit it. See listLocationsAndLanguages.',
      )
      .optional(),
    language_name: z
      .string()
      .describe(
        'Full language name, e.g. "English". This tool sends "English" if you omit it. See listLocationsAndLanguages.',
      )
      .optional(),
    search_partners: z
      .boolean()
      .describe("Include Google search partners in the numbers.")
      .optional(),
    date_from: z
      .string()
      .date()
      .describe("Start of the volume window, YYYY-MM-DD.")
      .optional(),
    date_to: z
      .string()
      .date()
      .describe("End of the volume window, YYYY-MM-DD.")
      .optional(),
    sort_by: z
      .string()
      .describe('Sort field, e.g. "search_volume", "cpc", "competition".')
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
          .string()
          .nullable()
          .describe("Competition level: LOW, MEDIUM, or HIGH.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Keyword volume metrics.")
    .optional(),
});

const definition = defineTool({
  name: "getSearchVolume",
  title: "Get Search Volume",
  description:
    "Get Google Ads search volume, CPC, and competition for keywords, from Google's own advertising data.",
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
    params["location_name"] = input.location_name ?? "United States";
    params["language_name"] = input.language_name ?? "English";
    if (input.search_partners !== undefined)
      params["search_partners"] = input.search_partners;
    if (input.date_from !== undefined) params["date_from"] = input.date_from;
    if (input.date_to !== undefined) params["date_to"] = input.date_to;
    if (input.sort_by !== undefined) params["sort_by"] = input.sort_by;
    return dataforseoLive(
      ctx.fetch,
      "/v3/keywords_data/google_ads/search_volume/live",
      params,
      "DataForSEO getSearchVolume",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
