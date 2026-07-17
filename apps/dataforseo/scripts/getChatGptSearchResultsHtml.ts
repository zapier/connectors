#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    keyword: z.string().describe("Query to ask ChatGPT search."),
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
    location_coordinate: z
      .string()
      .describe("Optional GPS coordinate string to localize the search.")
      .optional(),
    force_web_search: z
      .boolean()
      .describe("Force ChatGPT to use web search.")
      .optional(),
    expand_citations: z
      .boolean()
      .describe("Include the expanded citation bar in the HTML.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items_count: z.number().int().describe("Number of items returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        html: z
          .string()
          .nullable()
          .describe("Raw HTML of the ChatGPT results page.")
          .optional(),
        page: z
          .number()
          .int()
          .nullable()
          .describe("Serial page number.")
          .optional(),
        date: z
          .string()
          .nullable()
          .describe("When the page was fetched (UTC).")
          .optional(),
      }),
    )
    .nullable()
    .describe("HTML result items.")
    .optional(),
});

const definition = defineTool({
  name: "getChatGptSearchResultsHtml",
  title: "Get Chat Gpt Search Results Html",
  description:
    "Get the raw HTML of ChatGPT's search results page for a keyword. Use when you need the unparsed page rather than structured items.",
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
    if (input.location_coordinate !== undefined)
      params["location_coordinate"] = input.location_coordinate;
    if (input.force_web_search !== undefined)
      params["force_web_search"] = input.force_web_search;
    if (input.expand_citations !== undefined)
      params["expand_citations"] = input.expand_citations;
    return dataforseoLive(
      ctx.fetch,
      "/v3/ai_optimization/chat_gpt/llm_scraper/live/html",
      params,
      "DataForSEO getChatGptSearchResultsHtml",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
