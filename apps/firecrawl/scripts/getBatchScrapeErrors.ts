#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({ id: z.string().describe("The batch job id from batchScrape.") })
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
  name: "getBatchScrapeErrors",
  title: "Get Batch Scrape Errors",
  description:
    "List the per-URL errors and robots.txt-blocked URLs for a batch-scrape job.",
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
    const url = `https://api.firecrawl.dev/v2/batch/scrape/${encodeURIComponent(input.id)}/errors`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Firecrawl getBatchScrapeErrors");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
