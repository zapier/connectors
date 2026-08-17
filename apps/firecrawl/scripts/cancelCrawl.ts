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
const outputSchema = z.object({ status: z.literal("cancelled") });

const definition = defineTool({
  name: "cancelCrawl",
  title: "Cancel Crawl",
  description:
    "Cancel a running crawl job. Pages already scraped remain retrievable via getCrawlStatus.",
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
    const url = `https://api.firecrawl.dev/v2/crawl/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await throwIfNotOk(res, "Firecrawl cancelCrawl");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
