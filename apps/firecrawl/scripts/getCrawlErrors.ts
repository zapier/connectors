#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({ id: z.string().describe("The crawl job id from crawl.") })
  .strict();
const outputSchema = z.object({
  errors: z
    .array(
      z.object({
        id: z.string().nullable().optional(),
        timestamp: z.string().nullable().optional(),
        url: z.string().nullable().optional(),
        error: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .describe("Per-URL errors encountered during the job.")
    .optional(),
  robotsBlocked: z
    .array(z.string())
    .nullable()
    .describe("URLs skipped because robots.txt disallowed them.")
    .optional(),
});

const definition = defineTool({
  name: "getCrawlErrors",
  title: "Get Crawl Errors",
  description:
    "List the per-URL errors and robots.txt-blocked URLs for a crawl job. Use to diagnose why a crawl returned fewer pages than expected.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "firecrawl",
  run: async (input, ctx) => {
    const url = `https://api.firecrawl.dev/v2/crawl/${encodeURIComponent(input.id)}/errors`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Firecrawl getCrawlErrors");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
