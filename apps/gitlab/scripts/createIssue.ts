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
    title: z.string().describe("Issue title."),
    description: z
      .string()
      .describe("Markdown body (GitLab-flavored markdown; up to ~1 MB).")
      .optional(),
    labels: z.array(z.string()).describe("Label names to apply.").optional(),
    assignee_ids: z
      .array(z.number().int())
      .describe("User ids to assign. Resolve with findUsers.")
      .optional(),
    milestone_id: z
      .number()
      .int()
      .describe("Milestone to attach. Resolve with listMilestones.")
      .optional(),
    confidential: z
      .boolean()
      .describe("Mark the issue confidential.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  iid: z.number().int(),
  title: z.string(),
  state: z.string().nullable().optional(),
  web_url: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "createIssue",
  title: "Create Issue",
  description:
    "Open a new issue with a GitLab-flavored markdown description. Resolve assignee ids with findUsers, milestone id with listMilestones, and label names with listLabels first.",
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
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/issues`;
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body["title"] = input.title;
    if (input.description !== undefined)
      body["description"] = input.description;
    if (input.labels !== undefined) body["labels"] = input.labels;
    if (input.assignee_ids !== undefined)
      body["assignee_ids"] = input.assignee_ids;
    if (input.milestone_id !== undefined)
      body["milestone_id"] = input.milestone_id;
    if (input.confidential !== undefined)
      body["confidential"] = input.confidential;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Gitlab createIssue");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
