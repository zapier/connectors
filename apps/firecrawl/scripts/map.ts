#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    url: z.string().describe("The site URL to map, e.g. https://example.com."),
    search: z
      .string()
      .describe("Order returned URLs by relevance to this term.")
      .optional(),
    sitemap: z
      .enum(["skip", "include", "only"])
      .describe(
        "How to use the site's sitemap. 'include' (default) uses it plus link discovery; 'only' uses just the sitemap; 'skip' ignores it.",
      )
      .optional(),
    includeSubdomains: z
      .boolean()
      .describe("Include subdomain URLs. Defaults to true.")
      .optional(),
    ignoreQueryParameters: z
      .boolean()
      .describe(
        "Treat URLs that differ only by query string as one. Defaults to true.",
      )
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100000)
      .describe(
        "Max URLs to return. Defaults to 100 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  links: z.array(
    z.object({
      url: z.string(),
      title: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
    }),
  ),
});

const definition = defineTool({
  name: "map",
  title: "Map",
  description:
    "Discover URLs on a website extremely fast, optionally ranked by relevance to a search term. Use to enumerate a site before crawling, or to find a specific page's URL.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "firecrawl",
  run: async (input, ctx) => {
    const url = `https://api.firecrawl.dev/v2/map`;
    const body: Record<string, unknown> = {};
    if (input.url !== undefined) body["url"] = input.url;
    if (input.search !== undefined) body["search"] = input.search;
    if (input.sitemap !== undefined) body["sitemap"] = input.sitemap;
    if (input.includeSubdomains !== undefined)
      body["includeSubdomains"] = input.includeSubdomains;
    if (input.ignoreQueryParameters !== undefined)
      body["ignoreQueryParameters"] = input.ignoreQueryParameters;
    body["limit"] = input.limit ?? 100;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Firecrawl map");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
