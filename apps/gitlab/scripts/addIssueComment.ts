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
    issueIid: z.number().int().describe("Project-scoped issue iid."),
    body: z.string().describe("Comment body (markdown)."),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int(),
  body: z.string(),
  author: z.string().nullable().optional(),
  created_at: z.string().datetime({ offset: true }).nullable().optional(),
});

const definition = defineTool({
  name: "addIssueComment",
  title: "Add Issue Comment",
  description: "Add a comment (note) to an issue.",
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
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/issues/${encodeURIComponent(input.issueIid)}/notes`;
    const body: Record<string, unknown> = {};
    if (input.body !== undefined) body["body"] = input.body;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Gitlab addIssueComment");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
