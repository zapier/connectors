#!/usr/bin/env node
// findTask wraps the same GET /me/todo/lists/{listId}/tasks endpoint as
// listTasks, building the OData $filter server-side.
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
        'Task-list id from listLists. Omit to search your default list (the built-in "Tasks" list).',
      )
      .optional(),
    title: z
      .string()
      .describe(
        "Exact title to match via server-side OData equality, not a substring search.",
      ),
    includeCompleted: z
      .boolean()
      .describe(
        "Include completed tasks in the results. Defaults to false (only open tasks).",
      )
      .default(false),
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
  items: z.array(taskSchema).describe("Tasks matching the title."),
  next_cursor: z
    .string()
    .describe("Pass as cursor to fetch the next page. Absent on the last page.")
    .optional(),
});

/** Escape a value for OData string-literal interpolation by doubling single quotes. */
function odataQuote(value: string): string {
  return value.replace(/'/g, "''");
}

const definition = defineTool({
  name: "findTask",
  title: "Find Task",
  description:
    "Find tasks by exact title in a list, without hand-writing OData. Excludes completed tasks by default. Use listTasks(filter) for other query shapes.",
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
    // @odata.nextLink is an opaque full URL (already carrying the $filter
    // this page started with) — when paging, fetch it verbatim and skip
    // rebuilding the path/query.
    let url = input.cursor;
    if (url === undefined) {
      let filter = `title eq '${odataQuote(input.title)}'`;
      if (!input.includeCompleted) filter += " and status ne 'completed'";
      url = `${GRAPH_BASE}/me/todo/lists/${listPathSegment(input.listId)}/tasks${buildListQuery(
        {
          top: input.top ?? 10,
          filter,
        },
      )}`;
    }
    const res = await todoFetch(ctx.fetch, "findTask", url, {
      method: "GET",
    });
    return toListResult(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
