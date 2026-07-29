#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  buildListQuery,
  GRAPH_BASE,
  listPathSegment,
  taskSchema,
  todoFetch,
  toListResult,
} from "../lib/microsoft-todo.ts";

const inputSchema = z
  .object({
    listId: z
      .string()
      .describe(
        'Task-list id from listLists. Omit to list tasks in your default list (the built-in "Tasks" list).',
      )
      .optional(),
    filter: z
      .string()
      .describe(
        "OData filter, e.g. \"status ne 'completed'\" or \"title eq 'Buy milk'\". Quote string values with single quotes.",
      )
      .optional(),
    orderby: z
      .string()
      .describe(
        'OData sort, e.g. "createdDateTime desc" or "dueDateTime/dateTime asc".',
      )
      .optional(),
    top: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Max tasks to return per page. Defaults to 10 when omitted; pass a value when you need a specific number of results.",
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
  items: z.array(taskSchema).describe("The tasks on this page."),
  next_cursor: z
    .string()
    .describe("Pass as cursor to fetch the next page. Absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listTasks",
  title: "List Tasks",
  description:
    "List or filter tasks in a list. Use filter for title/status queries (folds find-a-task) and orderby to sort. Resolves task ids.",
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
      `${GRAPH_BASE}/me/todo/lists/${listPathSegment(input.listId)}/tasks${buildListQuery(
        {
          top: input.top ?? 10,
          filter: input.filter,
          orderby: input.orderby,
        },
      )}`;
    const res = await todoFetch(ctx.fetch, "listTasks", url, {
      method: "GET",
    });
    return toListResult(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
