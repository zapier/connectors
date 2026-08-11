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
  duration: z.union([z.number().int(), z.null()]).optional(),
  web_url: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "getPipeline",
  title: "Get Pipeline",
  description: "Get one pipeline's status and metadata.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "gitlab",
  run: async (input, ctx) => {
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/pipelines/${encodeURIComponent(input.pipelineId)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab getPipeline");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
