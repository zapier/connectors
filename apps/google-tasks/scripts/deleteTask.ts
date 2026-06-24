#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SUCCESS, throwForGoogleTasks } from "../lib/google-tasks.ts";

const inputSchema = z
  .object({
    tasklist: z
      .string()
      .describe(
        'Task-list id from listTaskLists, or the literal "@default" for the user\'s primary list.',
      ),
    task: z.string().describe("Task id from listTasks or getTask."),
  })
  .strict();
const outputSchema = z
  .object({
    success: z
      .boolean()
      .nullable()
      .describe("True when the operation completed.")
      .optional(),
  })
  .describe(
    "Confirmation that the operation succeeded (the API returns an empty body).",
  );

const definition = defineTool({
  name: "deleteTask",
  title: "Delete Task",
  description:
    "Permanently delete a task. Irreversible. Deleting one instance of a recurring task removes the whole series. To just hide completed tasks, use clearCompletedTasks.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "google-tasks",
  run: async (input, ctx) => {
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/tasks/${encodeURIComponent(input.task)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await throwForGoogleTasks(res, "deleteTask");
    return SUCCESS;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
