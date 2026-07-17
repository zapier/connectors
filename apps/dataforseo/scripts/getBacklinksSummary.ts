#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    target: z
      .string()
      .describe('Domain, subdomain, or URL to summarize, e.g. "example.com".'),
    include_subdomains: z
      .boolean()
      .describe("Include subdomain backlinks.")
      .optional(),
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
        target: z
          .string()
          .nullable()
          .describe("The analyzed target.")
          .optional(),
        backlinks: z
          .number()
          .int()
          .nullable()
          .describe("Total backlinks.")
          .optional(),
        referring_domains: z
          .number()
          .int()
          .nullable()
          .describe("Number of unique referring domains.")
          .optional(),
        referring_main_domains: z
          .number()
          .int()
          .nullable()
          .describe("Number of referring root domains.")
          .optional(),
        rank: z
          .number()
          .int()
          .nullable()
          .describe(
            "DataForSEO backlink rank, 0 (no backlinks detected) to 1000 (large number of quality backlinks) — higher is stronger.",
          )
          .optional(),
        backlinks_spam_score: z
          .number()
          .int()
          .nullable()
          .describe("Spam score")
          .optional(),
      }),
    )
    .nullable()
    .describe("Summary rows.")
    .optional(),
});

const definition = defineTool({
  name: "getBacklinksSummary",
  title: "Get Backlinks Summary",
  description:
    "Get an overview of a single domain or URL's backlink profile: total backlinks, referring domains, rank, and spam score. The best starting point for backlink analysis.",
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
    if (input.include_subdomains !== undefined)
      params["include_subdomains"] = input.include_subdomains;
    return dataforseoLive(
      ctx.fetch,
      "/v3/backlinks/summary/live",
      params,
      "DataForSEO getBacklinksSummary",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
