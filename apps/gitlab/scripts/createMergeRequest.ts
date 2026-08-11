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
    source_branch: z.string().describe("Branch with the changes."),
    target_branch: z.string().describe("Branch to merge into."),
    title: z.string().describe("Merge request title."),
    description: z.string().describe("Markdown body.").optional(),
    reviewer_ids: z
      .array(z.number().int())
      .describe("Reviewer user ids. Resolve with findUsers.")
      .optional(),
    assignee_ids: z
      .array(z.number().int())
      .describe("Assignee user ids. Resolve with findUsers.")
      .optional(),
    labels: z.array(z.string()).describe("Labels to apply.").optional(),
    remove_source_branch: z
      .boolean()
      .describe("Delete the source branch on merge.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  iid: z.number().int(),
  title: z.string(),
  state: z.string().nullable().optional(),
  web_url: z.string().nullable().optional(),
  source_branch: z.string().nullable().optional(),
  target_branch: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "createMergeRequest",
  title: "Create Merge Request",
  description:
    "Open a merge request from a source branch into a target branch. Resolve reviewer/assignee ids with findUsers and label names with listLabels first.",
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
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/merge_requests`;
    const body: Record<string, unknown> = {};
    if (input.source_branch !== undefined)
      body["source_branch"] = input.source_branch;
    if (input.target_branch !== undefined)
      body["target_branch"] = input.target_branch;
    if (input.title !== undefined) body["title"] = input.title;
    if (input.description !== undefined)
      body["description"] = input.description;
    if (input.reviewer_ids !== undefined)
      body["reviewer_ids"] = input.reviewer_ids;
    if (input.assignee_ids !== undefined)
      body["assignee_ids"] = input.assignee_ids;
    if (input.labels !== undefined) body["labels"] = input.labels;
    if (input.remove_source_branch !== undefined)
      body["remove_source_branch"] = input.remove_source_branch;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Gitlab createMergeRequest");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
