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
    prompt: z
      .string()
      .max(10000)
      .describe("What to research/extract, in natural language."),
    urls: z
      .array(z.string())
      .describe("Optional URLs to constrain the agent to.")
      .optional(),
    schema: z
      .record(z.string(), z.any())
      .describe("Optional JSON Schema describing the structured output shape.")
      .optional(),
    maxCredits: z
      .number()
      .int()
      .describe(
        "Cap on credits to spend (default 2500). Values above 2500 are billed as paid.",
      )
      .optional(),
    model: z
      .enum(["spark-1-mini", "spark-1-pro"])
      .describe("Agent model. Defaults to spark-1-mini.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z
    .string()
    .describe("The agent job id — pass to getAgentStatus or cancelAgent."),
});

const definition = defineTool({
  name: "startAgent",
  title: "Start Agent",
  description:
    "Start an async agent that browses the web to extract structured data from a natural-language prompt — no URL required. Returns a job id; poll getAgentStatus. The most capable extraction path.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "firecrawl",
  run: async (input, ctx) => {
    const url = `https://api.firecrawl.dev/v2/agent`;
    const body: Record<string, unknown> = {};
    if (input.prompt !== undefined) body["prompt"] = input.prompt;
    if (input.urls !== undefined) body["urls"] = input.urls;
    if (input.schema !== undefined) body["schema"] = input.schema;
    if (input.maxCredits !== undefined) body["maxCredits"] = input.maxCredits;
    if (input.model !== undefined) body["model"] = input.model;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Firecrawl startAgent");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
