#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  buildLlmMentionsTargets,
  dataforseoLiveRaw,
} from "../lib/dataforseo.ts";

const targetSet = z
  .object({
    aggregation_key: z
      .string()
      .describe(
        'Label this comparison group is reported under, e.g. "chatgpt" or "nike".',
      ),
    domains: z
      .array(z.string())
      .describe(
        'Websites/domains in this group, e.g. "nike.com". Provide domains and/or keywords.',
      )
      .optional(),
    keywords: z
      .array(z.string())
      .describe(
        'Search keywords or brand terms in this group, e.g. "running shoes". Provide keywords and/or domains.',
      )
      .optional(),
  })
  .strict();
const inputSchema = z
  .object({
    sets: z
      .array(targetSet)
      .min(2)
      .max(10)
      .describe(
        "Comparison groups to measure side by side; provide 2 to 10, each with its own aggregation_key.",
      ),
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
      "Aggregated mention metrics across all comparison sets, grouped by dimension (location, language, platform, sources_domain, …); each breakdown entry is { key, mentions, ai_search_volume }.",
    )
    .optional(),
  items: z
    .array(z.record(z.string(), z.json()))
    .nullable()
    .describe(
      "One row per comparison set. Each row carries `key` (the set's aggregation_key) plus the same per-dimension breakdowns as `total`, scoped to that set.",
    )
    .optional(),
});

const definition = defineTool({
  name: "getLlmMentionsCrossMetrics",
  title: "Get Llm Mentions Cross Aggregated Metrics",
  description:
    "Get AI-mention metrics for your targets grouped by custom keys (e.g. by platform or keyword). Use for comparative breakdowns.",
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
    params["targets"] = input.sets.map((set) => ({
      aggregation_key: set.aggregation_key,
      target: buildLlmMentionsTargets({
        domains: set.domains,
        keywords: set.keywords,
      }),
    }));
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
      "/v3/ai_optimization/llm_mentions/cross_aggregated_metrics/live",
      params,
      "DataForSEO getLlmMentionsCrossMetrics",
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
