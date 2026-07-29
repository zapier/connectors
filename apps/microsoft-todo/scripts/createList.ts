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
  .object({ displayName: z.string().describe("Name of the task list.") })
  .strict();

const definition = defineTool({
  name: "createList",
  title: "Create List",
  description: "Create a new task list.",
  inputSchema,
  outputSchema: taskListSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-todo",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}/me/todo/lists`;
    const res = await todoFetch(ctx.fetch, "createList", url, {
      method: "POST",
      body: JSON.stringify({ displayName: input.displayName }),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
