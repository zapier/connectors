#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { listResult } from "../lib/gitlab.ts";

const inputSchema = z
  .object({
    projectId: z.string().describe("Numeric id or encoded path."),
    pipelineId: z.number().int().describe("Pipeline id."),
    scope: z
      .enum([
        "created",
        "pending",
        "running",
        "failed",
        "success",
        "canceled",
        "skipped",
        "manual",
      ])
      .describe("Filter by job status.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      stage: z.string().nullable().optional(),
      status: z.string().nullable().optional(),
      web_url: z.string().nullable().optional(),
    }),
  ),
  nextPage: z.union([z.number().int(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listPipelineJobs",
  title: "List Pipeline Jobs",
  description:
    "List the jobs in a pipeline. Returns each job's id, which getJobLog takes.",
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
    const url = new URL(
      `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/pipelines/${encodeURIComponent(input.pipelineId)}/jobs`,
    );
    if (input.scope !== undefined) {
      url.searchParams.set("scope", String(input.scope));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab listPipelineJobs");
    return listResult(res);
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
