#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    keywords: z.array(z.string()).describe("Keywords to score (up to 1,000)."),
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
        keyword_difficulty: z
          .number()
          .int()
          .nullable()
          .describe("Ranking difficulty")
          .optional(),
      }),
    )
    .nullable()
    .describe("Keyword difficulty scores.")
    .optional(),
});

const definition = defineTool({
  name: "getKeywordDifficulty",
  title: "Get Keyword Difficulty",
  description:
    "Get the Keyword Difficulty score (0-100 ranking difficulty) for up to 1,000 keywords at once.",
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
      "/v3/dataforseo_labs/google/bulk_keyword_difficulty/live",
      params,
      "DataForSEO getKeywordDifficulty",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
