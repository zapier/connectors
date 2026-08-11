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
    body: z.string().describe("Comment body (markdown)."),
    file_path: z
      .string()
      .describe("The new-side file path the comment attaches to."),
    line: z.number().int().describe("The new-side line number in that file."),
    base_sha: z.string().describe("The diff base sha (from getMergeRequest)."),
    head_sha: z.string().describe("The diff head sha."),
    start_sha: z.string().describe("The diff start sha."),
  })
  .strict();
const outputSchema = z.object({
  id: z.string().describe("Discussion id."),
  notes: z
    .array(
      z.object({
        id: z.number().int(),
        body: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
  web_url: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "addMergeRequestDiffComment",
  title: "Add Merge Request Diff Comment",
  description:
    "Add a review comment pinned to a specific new-side line of a merge request diff. The three shas come from getMergeRequest's diff refs.",
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
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/merge_requests/${encodeURIComponent(input.mergeRequestIid)}/discussions`;
    const body = {
      body: input.body,
      position: {
        position_type: "text",
        base_sha: input.base_sha,
        head_sha: input.head_sha,
        start_sha: input.start_sha,
        new_path: input.file_path,
        new_line: input.line,
      },
    };
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Gitlab addMergeRequestDiffComment");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
