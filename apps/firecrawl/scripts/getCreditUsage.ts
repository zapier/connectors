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
  remainingCredits: z.number(),
  planCredits: z.number().nullable().optional(),
  billingPeriodStart: z.union([z.string(), z.null()]).optional(),
  billingPeriodEnd: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "getCreditUsage",
  title: "Get Credit Usage",
  description:
    "Get the team's remaining Firecrawl credits and billing period. Also the connection test — a 200 confirms the API key is valid.",
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
    const url = `https://api.firecrawl.dev/v2/team/credit-usage`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Firecrawl getCreditUsage");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
