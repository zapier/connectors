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
  name: "deleteTaskList",
  title: "Delete Task List",
  description:
    "Delete a task list and ALL tasks in it. Irreversible; assigned tasks also delete their source in Docs/Chat. Resolve the id via listTaskLists first.",
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
    const url = `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${encodeURIComponent(input.tasklist)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await throwForGoogleTasks(res, "deleteTaskList");
    return SUCCESS;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
