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
    merge_commit_message: z
      .string()
      .describe("Override the merge commit message.")
      .optional(),
    squash: z.boolean().describe("Squash commits on merge.").optional(),
    sha: z
      .string()
      .describe(
        "If set, the merge only proceeds when the MR head still equals this sha (from getMergeRequest) — guards against merging a moved head.",
      )
      .optional(),
    should_remove_source_branch: z
      .boolean()
      .describe("Delete the source branch after merge.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  iid: z.number().int(),
  state: z.string(),
  merge_commit_sha: z.union([z.string(), z.null()]).optional(),
  web_url: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "mergeMergeRequest",
  title: "Merge Merge Request",
  description:
    "Merge a merge request. Fails if it is not mergeable (conflicts, unmet approvals, or pipeline not passed). Pass sha from getMergeRequest for a safe merge that only proceeds if the head has not moved.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "gitlab",
  run: async (input, ctx) => {
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/merge_requests/${encodeURIComponent(input.mergeRequestIid)}/merge`;
    const body: Record<string, unknown> = {};
    if (input.merge_commit_message !== undefined)
      body["merge_commit_message"] = input.merge_commit_message;
    if (input.squash !== undefined) body["squash"] = input.squash;
    if (input.sha !== undefined) body["sha"] = input.sha;
    if (input.should_remove_source_branch !== undefined)
      body["should_remove_source_branch"] = input.should_remove_source_branch;
    const res = await ctx.fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Gitlab mergeMergeRequest");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
