#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    targets: z
      .array(z.string())
      .describe("Domains, subdomains, or URLs to estimate (up to 1,000)."),
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
  items_count: z.number().int().describe("Number of targets returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        target: z.string().nullable().describe("The domain or URL.").optional(),
        etv: z
          .number()
          .nullable()
          .describe("Estimated monthly organic traffic value.")
          .optional(),
        organic_count: z
          .number()
          .int()
          .nullable()
          .describe("Number of organic ranking keywords.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Traffic estimates.")
    .optional(),
});

const definition = defineTool({
  name: "getOrganicTraffic",
  title: "Get Organic Traffic",
  description:
    "Estimate current monthly organic Google traffic for up to 1,000 domains, subdomains, or pages.",
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
    if (input.targets !== undefined) params["targets"] = input.targets;
    if (input.location_name !== undefined)
      params["location_name"] = input.location_name;
    if (input.language_name !== undefined)
      params["language_name"] = input.language_name;
    const result = await dataforseoLive(
      ctx.fetch,
      "/v3/dataforseo_labs/google/bulk_traffic_estimation/live",
      params,
      "DataForSEO getOrganicTraffic",
    );
    // `metrics` is a map keyed by result type; surface the target plus the
    // organic traffic estimate and organic-keyword count.
    return {
      ...result,
      items: result.items.map((row) => {
        const r = row as {
          target?: string;
          metrics?: Record<string, { count?: number; etv?: number }>;
        };
        return {
          target: r.target ?? null,
          etv: r.metrics?.organic?.etv ?? null,
          organic_count: r.metrics?.organic?.count ?? null,
        };
      }),
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
