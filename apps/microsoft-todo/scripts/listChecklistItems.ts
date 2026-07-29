#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  buildListQuery,
  checklistItemSchema,
  GRAPH_BASE,
  todoFetch,
  toListResult,
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
    top: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Max checklist items to return per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    cursor: z
      .string()
      .describe(
        "Pagination cursor from a previous response's next_cursor. Omit for the first page.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z
    .array(checklistItemSchema)
    .describe("The checklist items on this page."),
  next_cursor: z
    .string()
    .describe("Pass as cursor to fetch the next page. Absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listChecklistItems",
  title: "List Checklist Items",
  description:
    "List the steps (checklist items) of a task. The resolver for checklistItemId.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "microsoft-todo",
  run: async (input, ctx) => {
    // @odata.nextLink is an opaque full URL — when paging, fetch it verbatim
    // and skip rebuilding the path/query.
    const url =
      input.cursor ??
      `${GRAPH_BASE}/me/todo/lists/${encodeURIComponent(input.listId)}/tasks/${encodeURIComponent(
        input.taskId,
      )}/checklistItems${buildListQuery({ top: input.top ?? 20 })}`;
    const res = await todoFetch(ctx.fetch, "listChecklistItems", url, {
      method: "GET",
    });
    return toListResult(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
