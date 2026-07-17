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
    links_scope: z
      .string()
      .describe('Which links to count: "all", "external", or "internal".')
      .optional(),
    items_list_limit: z
      .number()
      .int()
      .describe("Max ranked domains to return (up to 10).")
      .optional(),
    filters: z
      .string()
      .describe("Optional filter as a DataForSEO array-expression.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items_count: z.number().int().describe("Number of domains returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  total: z
    .record(z.string(), z.json())
    .nullable()
    .describe(
      "Aggregated mention metrics across all found domains, grouped by dimension (location, language, platform, sources_domain, …); each breakdown entry is { key, mentions, ai_search_volume }.",
    )
    .optional(),
  items: z
    .array(z.record(z.string(), z.json()))
    .nullable()
    .describe(
      "Ranked domains. Each row carries `key` (the cited domain) plus the same per-dimension breakdowns as `total`, scoped to this domain.",
    )
    .optional(),
});

const definition = defineTool({
  name: "getLlmMentionsTopDomains",
  title: "Get Llm Mentions Top Domains",
  description:
    "Rank the domains most often cited alongside your targets in AI answers.",
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
    if (input.links_scope !== undefined)
      params["links_scope"] = input.links_scope;
    if (input.items_list_limit !== undefined)
      params["items_list_limit"] = input.items_list_limit;
    if (input.filters !== undefined) params["filters"] = input.filters;
    const { result, cost } = await dataforseoLiveRaw<{
      total?: unknown;
      items?: unknown[];
    }>(
      ctx.fetch,
      "/v3/ai_optimization/llm_mentions/top_domains/live",
      params,
      "DataForSEO getLlmMentionsTopDomains",
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
