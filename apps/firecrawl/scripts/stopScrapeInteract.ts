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
    jobId: z.string().describe("The scrape's jobId (its metadata.scrapeId)."),
  })
  .strict();
const outputSchema = z.object({
  sessionDurationMs: z.number().nullable().optional(),
  creditsBilled: z.number().nullable().optional(),
});

const definition = defineTool({
  name: "stopScrapeInteract",
  title: "Stop Scrape Interact",
  description:
    "Stop the browser session tied to a scrape and stop its per-minute billing. Get jobId from the scrape's metadata.scrapeId.",
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
    const url = `https://api.firecrawl.dev/v2/scrape/${encodeURIComponent(input.jobId)}/interact`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await throwIfNotOk(res, "Firecrawl stopScrapeInteract");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
