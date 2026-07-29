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
  })
  .strict();

const definition = defineTool({
  name: "getList",
  title: "Get List",
  description: "Get a single task list by id.",
  inputSchema,
  outputSchema: taskListSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-todo",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}/me/todo/lists/${encodeURIComponent(input.listId)}`;
    const res = await todoFetch(ctx.fetch, "getList", url, { method: "GET" });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
