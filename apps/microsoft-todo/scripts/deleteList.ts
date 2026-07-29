#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  GRAPH_BASE,
  successResponseSchema,
  todoFetch,
} from "../lib/microsoft-todo.ts";

const inputSchema = z
  .object({
    listId: z.string().describe("Task-list id from listLists."),
  })
  .strict();

const definition = defineTool({
  name: "deleteList",
  title: "Delete List",
  description:
    "Delete a task list and ALL tasks in it. Irreversible. Built-in lists cannot be deleted. Resolve the id via listLists first.",
  inputSchema,
  outputSchema: successResponseSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-todo",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}/me/todo/lists/${encodeURIComponent(input.listId)}`;
    // Graph's DELETE /me/todo/lists/{id} returns 204 with no body — nothing
    // to echo back.
    await todoFetch(ctx.fetch, "deleteList", url, { method: "DELETE" });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
