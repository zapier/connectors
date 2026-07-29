#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { GRAPH_BASE, taskSchema, todoFetch } from "../lib/microsoft-todo.ts";

const inputSchema = z
  .object({
    listId: z
      .string()
      .describe(
        "Task-list id from listLists. Required here — the built-in Tasks alias only works on the collection endpoints (createTask/listTasks/findTask).",
      ),
    taskId: z
      .string()
      .describe(
        "Task id from listTasks, findTask, or getTask. Note the id changes if the task is moved to another list.",
      ),
  })
  .strict();

const definition = defineTool({
  name: "getTask",
  title: "Get Task",
  description:
    "Get a single task by id, including body, dates, status, importance, and categories.",
  inputSchema,
  outputSchema: taskSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-todo",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}/me/todo/lists/${encodeURIComponent(input.listId)}/tasks/${encodeURIComponent(input.taskId)}`;
    const res = await todoFetch(ctx.fetch, "getTask", url, { method: "GET" });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
