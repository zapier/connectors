#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLiveRaw } from "../lib/dataforseo.ts";

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
    force_web_search: z.boolean().describe("Force ChatGPT to use web search."),
  })
  .strict();
const outputSchema = z.object({
  items_count: z.number().int().describe("Number of items returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        type: z.string().nullable().describe("Result element type.").optional(),
        url: z.string().nullable().describe("Result URL.").optional(),
        title: z.string().nullable().describe("Result title.").optional(),
        description: z
          .string()
          .nullable()
          .describe("Result snippet.")
          .optional(),
        domain: z.string().nullable().describe("Result domain.").optional(),
        breadcrumb: z
          .string()
          .nullable()
          .describe("Result breadcrumb.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Web results ChatGPT surfaced/cited for the query.")
    .optional(),
});

const definition = defineTool({
  name: "getChatGptSearchResults",
  title: "Get Chat Gpt Search Results",
  description:
    "Get the web results ChatGPT cited for a keyword search in a location and language, as structured items (title, URL, snippet, domain).",
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
    const raw = await dataforseoLiveRaw(
      ctx.fetch,
      "/v3/ai_optimization/chat_gpt/llm_scraper/live/advanced",
      params,
      "DataForSEO getChatGptSearchResults",
    );
    // The scraper container holds parallel arrays; surface the web results
    // ChatGPT cited (search_results[]), the closest thing to a result list.
    const searchResults =
      (raw.result[0] as { search_results?: unknown[] } | undefined)
        ?.search_results ?? [];
    return {
      items: searchResults.map((row) => {
        const r = row as {
          type?: string;
          url?: string;
          title?: string;
          description?: string;
          domain?: string;
          breadcrumb?: string;
        };
        return {
          type: r.type ?? null,
          url: r.url ?? null,
          title: r.title ?? null,
          description: r.description ?? null,
          domain: r.domain ?? null,
          breadcrumb: r.breadcrumb ?? null,
        };
      }),
      items_count: searchResults.length,
      cost: raw.cost,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
