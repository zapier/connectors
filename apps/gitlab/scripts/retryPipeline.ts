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
    projectId: z.string().describe("Numeric id or encoded path."),
    pipelineId: z.number().int().describe("Pipeline id."),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int(),
  status: z.string(),
  ref: z.string().nullable().optional(),
  sha: z.string().nullable().optional(),
  web_url: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "retryPipeline",
  title: "Retry Pipeline",
  description:
    "Retry the failed and canceled jobs in a pipeline. Reruns only the jobs that did not succeed, keeping the passed ones.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "gitlab",
  run: async (input, ctx) => {
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/pipelines/${encodeURIComponent(input.pipelineId)}/retry`;
    const res = await ctx.fetch(url, {
      method: "POST",
    });
    await throwIfNotOk(res, "Gitlab retryPipeline");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
