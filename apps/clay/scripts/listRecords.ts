#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    tableId: z.string().describe("Table id, from listTables."),
    viewId: z.string().describe("View id, from getTable (views[].id)."),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Rows per page. Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.string().describe("The record's id."),
        cells: z
          .any()
          .nullable()
          .describe("Nested object — shape passes through.")
          .optional(),
      }),
    )
    .nullable()
    .describe("Matching rows.")
    .optional(),
});

const definition = defineTool({
  name: "listRecords",
  title: "List Records",
  description:
    "List a page of rows from a table view. The view sets which columns and order are returned. Get viewId from getTable (views[].id).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "clay",
  run: async (input, ctx) => {
    const url = new URL(
      `https://api.clay.com/v3/tables/${encodeURIComponent(input.tableId)}/views/${encodeURIComponent(input.viewId)}/records`,
    );
    url.searchParams.set("limit", String(input.limit ?? 20));
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Clay listRecords");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
