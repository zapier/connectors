#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    keywords: z
      .array(z.string())
      .describe("Keywords to classify (up to 1,000)."),
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
        keyword_intent: z
          .json()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
        secondary_keyword_intents: z
          .json()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Per-keyword intent.")
    .optional(),
});

const definition = defineTool({
  name: "getSearchIntent",
  title: "Get Search Intent",
  description:
    "Classify the search intent (informational, navigational, commercial, transactional) of up to 1,000 keywords, with a probability for each. Use to segment keywords by what the searcher wants.",
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
    if (input.language_name !== undefined)
      params["language_name"] = input.language_name;
    return dataforseoLive(
      ctx.fetch,
      "/v3/dataforseo_labs/google/search_intent/live",
      params,
      "DataForSEO getSearchIntent",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
