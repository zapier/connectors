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
    code: z
      .string()
      .describe(
        "Code to run in the sandbox. Provide code or prompt, not both. Fields `code` and `prompt` are mutually exclusive — pass at most one.",
      )
      .optional(),
    prompt: z
      .string()
      .max(10000)
      .describe(
        "Natural-language task for an AI agent to perform in the browser. Provide code or prompt, not both. Fields `code` and `prompt` are mutually exclusive — pass at most one.",
      )
      .optional(),
    language: z
      .enum(["python", "node", "bash"])
      .describe("Runtime for code. Defaults to node.")
      .optional(),
    timeout: z
      .number()
      .int()
      .gte(1)
      .lte(300)
      .describe("Execution timeout in seconds. Defaults to 30.")
      .optional(),
  })
  .strict()
  .refine(
    (input) =>
      [input.code, input.prompt].filter((v) => v !== undefined).length <= 1,
    {
      message:
        "Fields `code` and `prompt` are mutually exclusive — pass at most one.",
      path: ["code"],
    },
  )
  .meta({ allOf: [{ not: { required: ["code", "prompt"] } }] });
const outputSchema = z.object({
  output: z
    .union([
      z
        .string()
        .describe(
          "The AI agent's final answer (present when prompt was used).",
        ),
      z
        .null()
        .describe(
          "The AI agent's final answer (present when prompt was used).",
        ),
    ])
    .describe("The AI agent's final answer (present when prompt was used).")
    .optional(),
  stdout: z.union([z.string(), z.null()]).optional(),
  result: z.union([z.string(), z.null()]).optional(),
  stderr: z.union([z.string(), z.null()]).optional(),
  exitCode: z.union([z.number().int(), z.null()]).optional(),
  error: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "interactWithScrape",
  title: "Interact With Scrape",
  description:
    "Drive the browser session from a scrape — run code, or give an AI agent a natural-language prompt. Reuses the page state; provide code OR prompt. Get jobId from the scrape's metadata.scrapeId.",
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
    const url = `https://api.firecrawl.dev/v2/scrape/${encodeURIComponent(input.jobId)}/interact`;
    const body: Record<string, unknown> = {};
    if (input.code !== undefined) body["code"] = input.code;
    if (input.prompt !== undefined) body["prompt"] = input.prompt;
    if (input.language !== undefined) body["language"] = input.language;
    if (input.timeout !== undefined) body["timeout"] = input.timeout;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Firecrawl interactWithScrape");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
