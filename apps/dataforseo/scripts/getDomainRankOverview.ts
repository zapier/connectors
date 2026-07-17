#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    target: z.string().describe('Domain to analyze, e.g. "example.com".'),
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
  items_count: z
    .number()
    .int()
    .describe("Number of rows returned (usually 1)."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        organic_count: z
          .number()
          .int()
          .nullable()
          .describe("Number of organic ranking keywords.")
          .optional(),
        organic_etv: z
          .number()
          .nullable()
          .describe("Estimated organic traffic value.")
          .optional(),
        organic_pos_1: z
          .number()
          .int()
          .nullable()
          .describe("Keywords ranking in position 1.")
          .optional(),
        paid_count: z
          .number()
          .int()
          .nullable()
          .describe("Number of paid ranking keywords.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Rank overview rows.")
    .optional(),
});

const definition = defineTool({
  name: "getDomainRankOverview",
  title: "Get Domain Rank Overview",
  description:
    "Get a domain's organic and paid search overview: ranking-keyword counts, estimated traffic, and traffic value.",
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
    if (input.target !== undefined) params["target"] = input.target;
    if (input.location_name !== undefined)
      params["location_name"] = input.location_name;
    if (input.language_name !== undefined)
      params["language_name"] = input.language_name;
    const result = await dataforseoLive(
      ctx.fetch,
      "/v3/dataforseo_labs/google/domain_rank_overview/live",
      params,
      "DataForSEO getDomainRankOverview",
    );
    // Metrics are a map keyed by result type (organic / paid); flatten the
    // organic + paid counts and organic traffic value onto the declared surface.
    return {
      ...result,
      items: result.items.map((row) => {
        const m = (
          row as { metrics?: Record<string, { count?: number; etv?: number }> }
        ).metrics;
        return {
          organic_count: m?.organic?.count ?? null,
          organic_etv: m?.organic?.etv ?? null,
          paid_count: m?.paid?.count ?? null,
        };
      }),
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
