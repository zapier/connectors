#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    target: z.string().describe("Domain, subdomain, or URL to analyze."),
    backlinks_status_type: z
      .string()
      .describe(
        'Which links to count: "live", "lost", or "all". Defaults to live.',
      )
      .optional(),
    include_subdomains: z
      .boolean()
      .describe("Include subdomain backlinks.")
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
  items_count: z.number().int().describe("Number of anchors returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        anchor: z.string().nullable().describe("The anchor text.").optional(),
        backlinks: z
          .number()
          .int()
          .nullable()
          .describe("Backlinks using this anchor.")
          .optional(),
        referring_domains: z
          .number()
          .int()
          .nullable()
          .describe("Distinct domains using this anchor.")
          .optional(),
        first_seen: z
          .string()
          .nullable()
          .describe(
            'When this anchor was first seen, e.g. "2021-08-01 00:00:00 +00:00".',
          )
          .optional(),
      }),
    )
    .nullable()
    .describe("Anchor texts.")
    .optional(),
});

const definition = defineTool({
  name: "getBacklinkAnchors",
  title: "Get Backlink Anchors",
  description:
    "Get the anchor texts used in backlinks to a target, each with its backlink and referring-domain counts. Use to see how other sites describe a target when linking to it.",
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
    if (input.backlinks_status_type !== undefined)
      params["backlinks_status_type"] = input.backlinks_status_type;
    if (input.include_subdomains !== undefined)
      params["include_subdomains"] = input.include_subdomains;
    if (input.filters !== undefined) params["filters"] = input.filters;
    if (input.order_by !== undefined) params["order_by"] = input.order_by;
    params["limit"] = input.limit ?? 10;
    if (input.offset !== undefined) params["offset"] = input.offset;
    return dataforseoLive(
      ctx.fetch,
      "/v3/backlinks/anchors/live",
      params,
      "DataForSEO getBacklinkAnchors",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
