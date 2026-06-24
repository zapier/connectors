#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwForGoogleTasks } from "../lib/google-tasks.ts";

const inputSchema = z
  .object({
    tasklist: z
      .string()
      .describe(
        'Task-list id from listTaskLists, or the literal "@default" for the user\'s primary list.',
      ),
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
  name: "getTaskList",
  title: "Get Task List",
  description: "Get a single task list by id.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-tasks",
  run: async (input, ctx) => {
    const url = `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${encodeURIComponent(input.tasklist)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwForGoogleTasks(res, "getTaskList");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
