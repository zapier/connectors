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
const outputSchema = z.object({ status: z.string().nullable().optional() });

const definition = defineTool({
  name: "cancelAgent",
  title: "Cancel Agent",
  description: "Cancel a running agent job. Get the id from startAgent.",
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
    const url = `https://api.firecrawl.dev/v2/agent/${encodeURIComponent(input.jobId)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await throwIfNotOk(res, "Firecrawl cancelAgent");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
