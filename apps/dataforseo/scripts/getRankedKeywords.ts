#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    target: z
      .string()
      .describe('Domain, subdomain, or URL to analyze, e.g. "example.com".'),
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
    ignore_synonyms: z
      .boolean()
      .describe("Exclude highly similar synonym variations.")
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
  items_count: z.number().int().describe("Number of keywords returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        keyword: z
          .string()
          .nullable()
          .describe("A keyword the target ranks for.")
          .optional(),
        rank_absolute: z
          .number()
          .int()
          .nullable()
          .describe("Absolute SERP position.")
          .optional(),
        search_volume: z
          .number()
          .int()
          .nullable()
          .describe("Average monthly searches.")
          .optional(),
        etv: z
          .number()
          .nullable()
          .describe("Estimated traffic value from this keyword.")
          .optional(),
        url: z.string().nullable().describe("The ranking page URL.").optional(),
      }),
    )
    .nullable()
    .describe("Keywords the target ranks for.")
    .optional(),
});

const definition = defineTool({
  name: "getRankedKeywords",
  title: "Get Ranked Keywords",
  description:
    "List the keywords a domain or URL already ranks for in Google organic results, with position and volume. Use for competitor or self keyword-footprint analysis.",
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
    if (input.target !== undefined) params["target"] = input.target;
    if (input.location_name !== undefined)
      params["location_name"] = input.location_name;
    if (input.language_name !== undefined)
      params["language_name"] = input.language_name;
    if (input.ignore_synonyms !== undefined)
      params["ignore_synonyms"] = input.ignore_synonyms;
    if (input.filters !== undefined) params["filters"] = input.filters;
    if (input.order_by !== undefined) params["order_by"] = input.order_by;
    params["limit"] = input.limit ?? 20;
    if (input.offset !== undefined) params["offset"] = input.offset;
    const result = await dataforseoLive(
      ctx.fetch,
      "/v3/dataforseo_labs/google/ranked_keywords/live",
      params,
      "DataForSEO getRankedKeywords",
    );
    // Each row splits the keyword metrics (keyword_data) from the SERP placement
    // (ranked_serp_element.serp_item); flatten both onto the declared surface.
    return {
      ...result,
      items: result.items.map((row) => {
        const r = row as {
          keyword_data?: {
            keyword?: string;
            keyword_info?: { search_volume?: number };
          };
          ranked_serp_element?: {
            serp_item?: { rank_absolute?: number; etv?: number; url?: string };
          };
        };
        const serp = r.ranked_serp_element?.serp_item;
        return {
          keyword: r.keyword_data?.keyword ?? null,
          rank_absolute: serp?.rank_absolute ?? null,
          search_volume: r.keyword_data?.keyword_info?.search_volume ?? null,
          etv: serp?.etv ?? null,
          url: serp?.url ?? null,
        };
      }),
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
