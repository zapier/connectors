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
    endpoint: z
      .enum([
        "scrape",
        "crawl",
        "batch_scrape",
        "search",
        "extract",
        "map",
        "agent",
      ])
      .describe("Filter to jobs from one endpoint.")
      .optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Max jobs to return (1–100). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe("Pagination cursor from a previous response.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  data: z.array(
    z.object({
      id: z
        .string()
        .describe(
          "The job id — pass to the matching status tool (e.g. getCrawlStatus).",
        ),
      endpoint: z.string().nullable().optional(),
      created_at: z.string().nullable().optional(),
      target: z.union([z.string(), z.null()]).optional(),
    }),
  ),
  cursor: z.union([z.string(), z.null()]).optional(),
  has_more: z.boolean().nullable().optional(),
});

const definition = defineTool({
  name: "getActivity",
  title: "Get Activity",
  description:
    "List the team's API jobs from the last 24h — each with its id, endpoint, and target — so you can find a crawl/batch job id to poll. Paginate with the returned cursor.",
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
    const url = new URL(`https://api.firecrawl.dev/v2/team/activity`);
    if (input.endpoint !== undefined) {
      url.searchParams.set("endpoint", String(input.endpoint));
    }
    url.searchParams.set("limit", String(input.limit ?? 20));
    if (input.cursor !== undefined) {
      url.searchParams.set("cursor", String(input.cursor));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Firecrawl getActivity");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
