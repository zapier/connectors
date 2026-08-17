#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({ jobId: z.string().describe("The agent job id from startAgent.") })
  .strict();
const outputSchema = z.object({
  status: z.string().describe("Job state — poll until completed."),
  data: z
    .record(z.string(), z.any())
    .nullable()
    .describe("The extracted structured data (present once completed).")
    .optional(),
  model: z.string().nullable().optional(),
  creditsUsed: z.number().int().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "getAgentStatus",
  title: "Get Agent Status",
  description:
    "Get an agent job's status and extracted data. Poll until status is completed. Get the id from startAgent.",
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
    const url = `https://api.firecrawl.dev/v2/agent/${encodeURIComponent(input.jobId)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Firecrawl getAgentStatus");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
