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
    title: z.string().describe("New title.").optional(),
    description: z
      .string()
      .describe("New markdown body (replaces the existing body).")
      .optional(),
    add_labels: z
      .array(z.string())
      .describe("Labels to add without replacing existing ones.")
      .optional(),
    remove_labels: z.array(z.string()).describe("Labels to remove.").optional(),
    state_event: z
      .enum(["close", "reopen"])
      .describe("Close or reopen the issue.")
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
  name: "updateIssue",
  title: "Update Issue",
  description:
    "Update an issue's fields, or close/reopen it. Only fields you supply are changed — omit a field to leave it untouched.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "gitlab",
  run: async (input, ctx) => {
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/issues/${encodeURIComponent(input.issueIid)}`;
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body["title"] = input.title;
    if (input.description !== undefined)
      body["description"] = input.description;
    if (input.add_labels !== undefined) body["add_labels"] = input.add_labels;
    if (input.remove_labels !== undefined)
      body["remove_labels"] = input.remove_labels;
    if (input.state_event !== undefined)
      body["state_event"] = input.state_event;
    const res = await ctx.fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Gitlab updateIssue");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
