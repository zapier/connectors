#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { buildLlmMentionsTargets, dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    domains: z
      .array(z.string())
      .describe(
        'Websites/domains to track mentions for, e.g. "nike.com". Put domains here and search terms in keywords; provide at least one of the two.',
      )
      .optional(),
    keywords: z
      .array(z.string())
      .describe(
        'Search keywords or brand terms to track mentions for, e.g. "running shoes". Put keywords here and websites in domains; provide at least one of the two.',
      )
      .optional(),
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
    platform: z
      .string()
      .describe(
        'Target platform to analyze; accepted values are "chat_gpt" and "google". Defaults to "google".',
      )
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
        "Max results to return (up to 1000). Defaults to 10 when omitted; pass a value when you need a specific number of results.",
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
  items_count: z.number().int().describe("Number of mentions returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        platform: z
          .string()
          .nullable()
          .describe("AI platform the mention appeared on.")
          .optional(),
        question: z
          .string()
          .nullable()
          .describe("The query that produced the answer.")
          .optional(),
        answer: z
          .string()
          .nullable()
          .describe("The AI answer text (markdown) mentioning the target.")
          .optional(),
        sources: z
          .array(
            z.object({
              title: z.string().nullable().optional(),
              url: z.string().nullable().optional(),
              domain: z.string().nullable().optional(),
            }),
          )
          .nullable()
          .describe("Sources the AI cited when generating the answer.")
          .optional(),
      }),
    )
    .nullable()
    .describe(
      "Mentions: the platform, the query asked, the AI answer text, and the sources it cited.",
    )
    .optional(),
});

const definition = defineTool({
  name: "getLlmMentions",
  title: "Get Llm Mentions",
  description:
    "Find where target brands, domains, or keywords are mentioned in AI-generated answers, with the surrounding context. Use to track brand visibility in AI search.",
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
    params["target"] = buildLlmMentionsTargets({
      domains: input.domains,
      keywords: input.keywords,
    });
    params["location_name"] = input.location_name ?? "United States";
    params["language_name"] = input.language_name ?? "English";
    if (input.platform !== undefined) params["platform"] = input.platform;
    if (input.filters !== undefined) params["filters"] = input.filters;
    if (input.order_by !== undefined) params["order_by"] = input.order_by;
    params["limit"] = input.limit ?? 10;
    if (input.offset !== undefined) params["offset"] = input.offset;
    return dataforseoLive(
      ctx.fetch,
      "/v3/ai_optimization/llm_mentions/search/live",
      params,
      "DataForSEO getLlmMentions",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
