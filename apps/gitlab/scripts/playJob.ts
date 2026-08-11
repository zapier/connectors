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
    jobId: z.number().int().describe("Job id (from listPipelineJobs)."),
    variables: z
      .record(z.string(), z.string())
      .describe("Map of job variable name to value for this run.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int(),
  name: z.string().nullable().optional(),
  status: z.string(),
  stage: z.string().nullable().optional(),
  web_url: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "playJob",
  title: "Play Job",
  description:
    "Start a manual job that is waiting for a manual action (a play button in the pipeline). Optionally pass job variables for this run.",
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
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/jobs/${encodeURIComponent(input.jobId)}/play`;
    const body: Record<string, unknown> = {};
    if (input.variables !== undefined) body["variables"] = input.variables;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Gitlab playJob");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
