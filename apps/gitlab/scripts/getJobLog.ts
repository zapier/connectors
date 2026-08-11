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
  })
  .strict();
const outputSchema = z.object({ job_id: z.number().int(), log: z.string() });

const definition = defineTool({
  name: "getJobLog",
  title: "Get Job Log",
  description:
    "Get the log output of a CI job. Content-heavy — fetch a log only when diagnosing a specific failed job.",
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
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/jobs/${encodeURIComponent(input.jobId)}/trace`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab getJobLog");
    const log = await res.text();
    return { job_id: input.jobId, log };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
