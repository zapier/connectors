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
  name: "clearCompletedTasks",
  title: "Clear Completed Tasks",
  description:
    "Hide all completed tasks in a list. They stop appearing by default but remain retrievable with showHidden=true. Non-destructive; active tasks are untouched.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "google-tasks",
  run: async (input, ctx) => {
    const url = `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(input.tasklist)}/clear`;
    const res = await ctx.fetch(url, {
      method: "POST",
    });
    await throwForGoogleTasks(res, "clearCompletedTasks");
    return SUCCESS;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
