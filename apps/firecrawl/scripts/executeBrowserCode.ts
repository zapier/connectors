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
    sessionId: z.string().describe("The session id from createBrowserSession."),
    code: z
      .string()
      .describe(
        "Code to run in the browser sandbox (page = a Playwright Page).",
      ),
    language: z
      .enum(["python", "node", "bash"])
      .describe("Runtime. Defaults to node.")
      .optional(),
    timeout: z
      .number()
      .int()
      .gte(1)
      .lte(300)
      .describe("Execution timeout in seconds (1–300).")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  stdout: z.union([z.string(), z.null()]).optional(),
  result: z
    .union([
      z.string().describe("The last expression's value."),
      z.null().describe("The last expression's value."),
    ])
    .describe("The last expression's value.")
    .optional(),
  stderr: z.union([z.string(), z.null()]).optional(),
  exitCode: z.union([z.number().int(), z.null()]).optional(),
  killed: z
    .boolean()
    .nullable()
    .describe("True if killed by timeout.")
    .optional(),
  error: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "executeBrowserCode",
  title: "Execute Browser Code",
  description:
    "Run Playwright/agent-browser code in a live browser session and get its output. The session keeps state between calls. Create the session with createBrowserSession first.",
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
    const url = `https://api.firecrawl.dev/v2/interact/${encodeURIComponent(input.sessionId)}/execute`;
    const body: Record<string, unknown> = {};
    if (input.code !== undefined) body["code"] = input.code;
    if (input.language !== undefined) body["language"] = input.language;
    if (input.timeout !== undefined) body["timeout"] = input.timeout;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Firecrawl executeBrowserCode");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
