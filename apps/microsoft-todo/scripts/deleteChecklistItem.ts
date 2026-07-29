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
    checklistItemId: z
      .string()
      .describe("Checklist-item (step) id from listChecklistItems."),
  })
  .strict();

const definition = defineTool({
  name: "deleteChecklistItem",
  title: "Delete Checklist Item",
  description: "Delete a step (checklist item) from a task. Irreversible.",
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
    const url = `${GRAPH_BASE}/me/todo/lists/${encodeURIComponent(input.listId)}/tasks/${encodeURIComponent(
      input.taskId,
    )}/checklistItems/${encodeURIComponent(input.checklistItemId)}`;
    // Graph's DELETE checklistItem returns 204 with no body — nothing to
    // echo back.
    await todoFetch(ctx.fetch, "deleteChecklistItem", url, {
      method: "DELETE",
    });
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
