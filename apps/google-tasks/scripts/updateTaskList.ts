#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleTasks } from "../lib/google-tasks.ts";

const inputSchema = z
  .object({
    tasklist: z.string().describe("Task-list id (resolve via listTaskLists)."),
    title: z.string().max(1024).describe("Title of the task list."),
  })
  .strict();
const outputSchema = z
  .object({
    id: z
      .string()
      .nullable()
      .describe(
        "Task-list id. Pass as the tasklist path parameter on task calls.",
      )
      .optional(),
    title: z.string().nullable().describe("Title of the task list.").optional(),
    updated: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .describe("Last-modified time (RFC3339). Read-only.")
      .optional(),
  })
  .describe("A task list.");

const definition = defineTool({
  name: "updateTaskList",
  title: "Update Task List",
  description:
    "Rename a task list. Only the fields you send change; title is the only editable field.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-tasks",
  run: async (input, ctx) => {
    const url = `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${encodeURIComponent(input.tasklist)}`;
    const body: Record<string, unknown> = {};
    if (input.title !== undefined) body["title"] = input.title;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwForGoogleTasks(res, "updateTaskList");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
