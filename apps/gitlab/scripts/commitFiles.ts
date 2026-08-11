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
    branch: z.string().describe("Branch to commit to."),
    commit_message: z.string().describe("Commit message."),
    actions: z
      .array(
        z
          .object({
            action: z
              .enum(["create", "update", "delete", "move", "chmod"])
              .describe("The change to apply to this file."),
            file_path: z.string().describe("Path of the file to change."),
            content: z
              .string()
              .describe("New file content (required for create and update).")
              .optional(),
            previous_path: z
              .string()
              .describe("Original path (required for move).")
              .optional(),
          })
          .strict(),
      )
      .describe("One entry per file change."),
    start_branch: z
      .string()
      .describe("Create branch from this branch if it does not yet exist.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  id: z.string(),
  short_id: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  web_url: z.string().nullable().optional(),
  created_at: z.string().datetime({ offset: true }).nullable().optional(),
});

const definition = defineTool({
  name: "commitFiles",
  title: "Commit Files",
  description:
    "Create, update, delete, move, or chmod multiple files in a single atomic commit. Each actions entry describes one file change.",
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
    const url = `https://gitlab.com/api/v4/projects/${encodeURIComponent(input.projectId)}/repository/commits`;
    const body: Record<string, unknown> = {};
    if (input.branch !== undefined) body["branch"] = input.branch;
    if (input.commit_message !== undefined)
      body["commit_message"] = input.commit_message;
    if (input.actions !== undefined) body["actions"] = input.actions;
    if (input.start_branch !== undefined)
      body["start_branch"] = input.start_branch;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Gitlab commitFiles");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
