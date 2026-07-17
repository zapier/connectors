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
  items_count: z
    .number()
    .int()
    .describe("Number of referring domains returned."),
  cost: z.number().nullable().describe("Credit cost in USD.").optional(),
  items: z
    .array(
      z.object({
        domain: z
          .string()
          .nullable()
          .describe("The referring domain.")
          .optional(),
        backlinks: z
          .number()
          .int()
          .nullable()
          .describe("Backlinks from this domain to the target.")
          .optional(),
        referring_pages: z
          .number()
          .int()
          .nullable()
          .describe("Pages on this domain that link to the target.")
          .optional(),
        rank: z
          .number()
          .int()
          .nullable()
          .describe(
            "Backlink rank of the referring domain, 0 (no backlinks detected) to 1000 (large number of quality backlinks) — higher is stronger.",
          )
          .optional(),
        first_seen: z
          .string()
          .nullable()
          .describe(
            'When a link from this domain was first seen, e.g. "2022-01-10 09:30:00 +00:00".',
          )
          .optional(),
      }),
    )
    .nullable()
    .describe("Referring domains.")
    .optional(),
});

const definition = defineTool({
  name: "getReferringDomains",
  title: "Get Referring Domains",
  description:
    "Get an overview of the domains linking to a target, each with its backlink count, rank, and first-seen date. Use to see who links to a site at the domain level.",
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
      "/v3/backlinks/referring_domains/live",
      params,
      "DataForSEO getReferringDomains",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
