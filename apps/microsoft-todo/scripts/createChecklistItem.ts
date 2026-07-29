#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  checklistItemSchema,
  GRAPH_BASE,
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
    displayName: z.string().describe("The step text."),
    isChecked: z
      .boolean()
      .describe("Whether the step is checked off. Defaults to false.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "createChecklistItem",
  title: "Create Checklist Item",
  description: "Add a step (checklist item) to a task.",
  inputSchema,
  outputSchema: checklistItemSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "microsoft-todo",
  run: async (input, ctx) => {
    const url = `${GRAPH_BASE}/me/todo/lists/${encodeURIComponent(input.listId)}/tasks/${encodeURIComponent(
      input.taskId,
    )}/checklistItems`;
    const body: Record<string, unknown> = { displayName: input.displayName };
    if (input.isChecked !== undefined) body["isChecked"] = input.isChecked;
    const res = await todoFetch(ctx.fetch, "createChecklistItem", url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
