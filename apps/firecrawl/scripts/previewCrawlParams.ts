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
    url: z.string().describe("The site URL the crawl would start from."),
    prompt: z
      .string()
      .max(10000)
      .describe("Natural-language description of what to crawl."),
  })
  .strict();
const outputSchema = z.object({
  url: z.string().nullable().optional(),
  includePaths: z.array(z.string()).nullable().optional(),
  excludePaths: z.array(z.string()).nullable().optional(),
  limit: z.number().int().nullable().optional(),
  sitemap: z.string().nullable().optional(),
  crawlEntireDomain: z.boolean().nullable().optional(),
  allowExternalLinks: z.boolean().nullable().optional(),
  allowSubdomains: z.boolean().nullable().optional(),
});

const definition = defineTool({
  name: "previewCrawlParams",
  title: "Preview Crawl Params",
  description:
    "Turn a natural-language prompt into the crawl parameters Firecrawl would use, without spending credits. Use to sanity-check a crawl's scope before calling crawl.",
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
    const url = `https://api.firecrawl.dev/v2/crawl/params-preview`;
    const body: Record<string, unknown> = {};
    if (input.url !== undefined) body["url"] = input.url;
    if (input.prompt !== undefined) body["prompt"] = input.prompt;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Firecrawl previewCrawlParams");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
