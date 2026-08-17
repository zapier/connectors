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
const outputSchema = z.object({ status: z.literal("cancelled") });

const definition = defineTool({
  name: "cancelBatchScrape",
  title: "Cancel Batch Scrape",
  description:
    "Cancel a running batch-scrape job. Pages already scraped remain retrievable via getBatchScrapeStatus.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "firecrawl",
  run: async (input, ctx) => {
    const url = `https://api.firecrawl.dev/v2/batch/scrape/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await throwIfNotOk(res, "Firecrawl cancelBatchScrape");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
