#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  crawls: z.array(
    z.object({ id: z.string(), url: z.string().nullable().optional() }),
  ),
});

const definition = defineTool({
  name: "getActiveCrawls",
  title: "Get Active Crawls",
  description:
    "List the crawl jobs currently running for the authenticated team, with their ids and start URLs.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "firecrawl",
  run: async (_input, ctx) => {
    const url = `https://api.firecrawl.dev/v2/crawl/active`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Firecrawl getActiveCrawls");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
