#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    targets: z
      .array(z.string())
      .describe("Pages, domains, or subdomains (up to 1,000)."),
    include_subdomains: z
      .boolean()
      .describe("Include subdomain backlinks.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items_count: z.number().int().describe("Number of targets returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        target: z
          .string()
          .nullable()
          .describe("The page or domain.")
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
          .describe("Unique referring domains.")
          .optional(),
        rank: z
          .number()
          .int()
          .nullable()
          .describe(
            "Backlink rank, 0 (no backlinks detected) to 1000 (large number of quality backlinks) — higher is stronger.",
          )
          .optional(),
      }),
    )
    .nullable()
    .describe("Per-target counts.")
    .optional(),
});

const definition = defineTool({
  name: "getBacklinksBulkPagesSummary",
  title: "Get Backlinks Bulk Pages Summary",
  description:
    "Get backlink counts and referring-domain totals for a bulk of up to 1,000 pages, domains, or subdomains at once.",
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
    if (input.include_subdomains !== undefined)
      params["include_subdomains"] = input.include_subdomains;
    const result = await dataforseoLive(
      ctx.fetch,
      "/v3/backlinks/bulk_pages_summary/live",
      params,
      "DataForSEO getBacklinksBulkPagesSummary",
    );
    // The per-page row keys the analyzed page on `url` (not `target` like the
    // single-target summary endpoint); surface it under `target` for consistency.
    return {
      ...result,
      items: result.items.map((row) => {
        const r = row as {
          url?: string;
          target?: string;
          backlinks?: number;
          referring_domains?: number;
          rank?: number;
        };
        return {
          target: r.url ?? r.target ?? null,
          backlinks: r.backlinks ?? null,
          referring_domains: r.referring_domains ?? null,
          rank: r.rank ?? null,
        };
      }),
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
