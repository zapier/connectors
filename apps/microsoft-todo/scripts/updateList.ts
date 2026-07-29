#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH_BASE,
  taskListSchema,
  todoFetch,
} from "../lib/microsoft-todo.ts";

const inputSchema = z
  .object({
    listId: z.string().describe("Task-list id from listLists."),
    displayName: z.string().describe("Name of the task list."),
  })
  .strict();

const definition = defineTool({
  name: "updateList",
  title: "Update List",
  description:
    "Rename a task list. Only the fields you send change; name is the only editable field. Built-in lists cannot be renamed.",
  inputSchema,
  outputSchema: taskListSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-todo",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}/me/todo/lists/${encodeURIComponent(input.listId)}`;
    const res = await todoFetch(ctx.fetch, "updateList", url, {
      method: "PATCH",
      body: JSON.stringify({ displayName: input.displayName }),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
