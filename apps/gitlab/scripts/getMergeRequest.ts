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
    mergeRequestIid: z
      .number()
      .int()
      .describe("Project-scoped merge request iid."),
  })
  .strict();
const outputSchema = z.object({
  iid: z.number().int(),
  title: z.string(),
  description: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  source_branch: z.string().nullable().optional(),
  target_branch: z.string().nullable().optional(),
  merge_status: z.string().nullable().optional(),
  has_conflicts: z.boolean().nullable().optional(),
  web_url: z.string().nullable().optional(),
  sha: z
    .string()
    .nullable()
    .describe("Head sha; pass to mergeMergeRequest for a safe merge.")
    .optional(),
});

const definition = defineTool({
  name: "getMergeRequest",
  title: "Get Merge Request",
  description:
    "Get one merge request's full detail — the entry point to the review loop. Its sha and diff refs feed mergeMergeRequest and addMergeRequestDiffComment.",
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
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/merge_requests/${encodeURIComponent(input.mergeRequestIid)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Gitlab getMergeRequest");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
