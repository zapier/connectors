#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  buildListQuery,
  GRAPH_BASE,
  taskListSchema,
  todoFetch,
  toListResult,
} from "../lib/microsoft-todo.ts";

const inputSchema = z
  .object({
    top: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Max task lists to return per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
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
  items: z.array(taskListSchema).describe("The task lists on this page."),
  next_cursor: z
    .string()
    .describe("Pass as cursor to fetch the next page. Absent on the last page.")
    .optional(),
});

const definition = defineTool({
  name: "listLists",
  title: "List Lists",
  description:
    "List the user's task lists with id, name, and which one is the built-in default. The primary way to resolve a list id before any task call.",
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
      `${GRAPH_BASE}/me/todo/lists${buildListQuery({ top: input.top ?? 20 })}`;
    const res = await todoFetch(ctx.fetch, "listLists", url, {
      method: "GET",
    });
    return toListResult(await res.json());
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
