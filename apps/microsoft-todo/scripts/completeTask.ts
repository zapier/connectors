#!/usr/bin/env node
// completeTask wraps the same PATCH /me/todo/lists/{listId}/tasks/{taskId}
// endpoint as updateTask (fixed body { status: "completed" }). Reopening is
// not a dedicated tool: use updateTask(status: "notStarted").
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH_BASE, taskSchema, todoFetch } from "../lib/microsoft-todo.ts";

const inputSchema = z
  .object({
    listId: z
      .string()
      .describe(
        "Task-list id from listLists. Required here — this connector always resolves a real listId for single-item and checklist operations rather than relying on the Tasks alias, whose support outside the collection endpoints (createTask/listTasks/findTask) is unconfirmed.",
      ),
    taskId: z
      .string()
      .describe(
        "Task id from listTasks, findTask, or getTask. Note the id changes if the task is moved to another list.",
      ),
  })
  .strict();

const definition = defineTool({
  name: "completeTask",
  title: "Complete Task",
  description:
    'Mark a task done by setting status to completed. To reopen a completed task, use updateTask(status: "notStarted").',
  inputSchema,
  outputSchema: taskSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-todo",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}/me/todo/lists/${encodeURIComponent(input.listId)}/tasks/${encodeURIComponent(input.taskId)}`;
    const res = await todoFetch(ctx.fetch, "completeTask", url, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
