#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { dataforseoLive } from "../lib/dataforseo.ts";

const inputSchema = z
  .object({
    target: z
      .string()
      .describe("Domain, subdomain, or URL to get backlinks for."),
    mode: z
      .string()
      .describe('Grouping: "as_is", "one_per_domain", or "one_per_anchor".')
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
    backlinks_status_type: z
      .string()
      .describe(
        'Which links to include: "live", "lost", or "all". Defaults to live.',
      )
      .optional(),
    include_subdomains: z
      .boolean()
      .describe("Include subdomain backlinks.")
      .optional(),
    include_indirect_links: z
      .boolean()
      .describe("Include redirect/canonical indirect links.")
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
  items_count: z.number().int().describe("Number of backlinks returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        url_from: z
          .string()
          .nullable()
          .describe("Page the link is on.")
          .optional(),
        url_to: z
          .string()
          .nullable()
          .describe("Page the link points to.")
          .optional(),
        anchor: z.string().nullable().describe("Anchor text.").optional(),
        dofollow: z
          .boolean()
          .nullable()
          .describe("Whether the link is dofollow.")
          .optional(),
        domain_from_rank: z
          .number()
          .int()
          .nullable()
          .describe(
            "Backlink rank of the linking domain, 0 (no backlinks detected) to 1000 (large number of quality backlinks) — higher is stronger.",
          )
          .optional(),
        first_seen: z
          .string()
          .nullable()
          .describe(
            'When the link was first seen, e.g. "2023-05-14 12:00:00 +00:00".',
          )
          .optional(),
      }),
    )
    .nullable()
    .describe("Backlinks.")
    .optional(),
});

const definition = defineTool({
  name: "getBacklinks",
  title: "Get Backlinks",
  description:
    "List individual backlinks pointing to a domain, subdomain, or page, with anchor text and link attributes. Use after getBacklinksSummary to inspect specific links.",
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
    if (input.mode !== undefined) params["mode"] = input.mode;
    if (input.filters !== undefined) params["filters"] = input.filters;
    if (input.order_by !== undefined) params["order_by"] = input.order_by;
    if (input.backlinks_status_type !== undefined)
      params["backlinks_status_type"] = input.backlinks_status_type;
    if (input.include_subdomains !== undefined)
      params["include_subdomains"] = input.include_subdomains;
    if (input.include_indirect_links !== undefined)
      params["include_indirect_links"] = input.include_indirect_links;
    params["limit"] = input.limit ?? 10;
    if (input.offset !== undefined) params["offset"] = input.offset;
    return dataforseoLive(
      ctx.fetch,
      "/v3/backlinks/backlinks/live",
      params,
      "DataForSEO getBacklinks",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
