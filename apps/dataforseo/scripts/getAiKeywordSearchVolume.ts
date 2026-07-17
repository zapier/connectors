#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    keywords: z.array(z.string()).describe("Keywords to look up."),
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
  })
  .strict();
const outputSchema = z.object({
  items_count: z.number().int().describe("Number of keywords returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        keyword: z.string().nullable().describe("The keyword.").optional(),
        ai_search_volume: z
          .number()
          .int()
          .nullable()
          .describe("Estimated monthly usage in AI tools.")
          .optional(),
      }),
    )
    .nullable()
    .describe("AI keyword volume metrics.")
    .optional(),
});

const definition = defineTool({
  name: "getAiKeywordSearchVolume",
  title: "Get Ai Keyword Search Volume",
  description:
    "Get estimated keyword usage volume inside AI tools (ChatGPT, etc.) — the AI-search analogue of Google search volume.",
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
    return dataforseoLive(
      ctx.fetch,
      "/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live",
      params,
      "DataForSEO getAiKeywordSearchVolume",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
