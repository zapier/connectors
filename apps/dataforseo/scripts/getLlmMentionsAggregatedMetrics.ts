#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  buildLlmMentionsTargets,
  dataforseoLiveRaw,
} from "../lib/dataforseo.ts";

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
        'Full location name, e.g. "United States". This tool sends "United States" if you omit it.',
      )
      .optional(),
    language_name: z
      .string()
      .describe(
        'Full language name, e.g. "English". This tool sends "English" if you omit it.',
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
      .describe("Optional filter as a DataForSEO array-expression.")
      .optional(),
    internal_list_limit: z
      .number()
      .int()
      .describe("Max items within internal arrays (up to 10).")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items_count: z.number().int().describe("Number of rows returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  total: z
    .record(z.string(), z.json())
    .nullable()
    .describe(
      "Aggregated metrics grouped by dimension (location, language, platform, sources_domain, search_results_domain, brand_entities_title, brand_entities_category); each entry is { key, mentions, ai_search_volume }.",
    )
    .optional(),
  items: z
    .array(z.record(z.string(), z.json()))
    .nullable()
    .describe(
      "Always empty for this tool — the endpoint returns only the aggregated `total` summary, not per-row items.",
    )
    .optional(),
});

const definition = defineTool({
  name: "getLlmMentionsAggregatedMetrics",
  title: "Get Llm Mentions Aggregated Metrics",
  description:
    "Get aggregate AI-mention metrics (mention counts and AI search volume) for your targets, grouped by location, language, platform, and source domain.",
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
    if (input.internal_list_limit !== undefined)
      params["internal_list_limit"] = input.internal_list_limit;
    const { result, cost } = await dataforseoLiveRaw<{
      total?: unknown;
      items?: unknown[];
    }>(
      ctx.fetch,
      "/v3/ai_optimization/llm_mentions/aggregated_metrics/live",
      params,
      "DataForSEO getLlmMentionsAggregatedMetrics",
    );
    const row = result[0];
    const items = row?.items ?? [];
    return {
      items,
      items_count: items.length,
      total: row?.total ?? null,
      cost,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
