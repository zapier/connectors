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
    ref: z.string().describe("Branch or tag to run the pipeline on."),
    variables: z
      .record(z.string(), z.string())
      .describe("Map of CI/CD variable name to value for this run.")
      .optional(),
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
  name: "triggerPipeline",
  title: "Trigger Pipeline",
  description:
    "Run a new pipeline on a ref. Note the singular path — list and get pipelines use the plural /pipelines.",
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
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/pipeline`;
    const body: Record<string, unknown> = {};
    if (input.ref !== undefined) body["ref"] = input.ref;
    if (input.variables !== undefined)
      body["variables"] = Object.entries(input.variables).map(
        ([key, value]) => ({ key, value: String(value) }),
      );
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Gitlab triggerPipeline");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
