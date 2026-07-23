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
    cells: z
      .record(z.string(), z.any())
      .describe(
        "Cell values keyed by field id (f_...). Scalars take a plain value; a select field takes { optionIds: [id] } (ids from getTable); a users field takes { userIds: [id] } (ids from listWorkspaceUsers).",
      ),
  })
  .strict();
const outputSchema = z.object({
  id: z.string().describe("The record's id."),
  cells: z
    .record(z.string(), z.any())
    .nullable()
    .describe("Stored cell values, keyed by field id.")
    .optional(),
});

const definition = defineTool({
  name: "createRecord",
  title: "Create Record",
  description:
    "Add a new row to a Clay table. Provide cell values keyed by field id (from getTable). Adding a row may run enrichment columns, which consume Clay credits.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "clay",
  run: async (input, ctx) => {
    const url = `https://api.clay.com/v3/tables/${encodeURIComponent(input.tableId)}/records`;
    // Clay's create endpoint takes a batch envelope `{ records: [{ cells }] }`
    // and returns the created rows under `records`; the agent surface is a
    // single row, so wrap on the way in and unwrap records[0] on the way out.
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: [{ cells: input.cells }] }),
    });
    await throwIfNotOk(res, "Clay createRecord");
    const payload = (await res.json()) as {
      records?: Array<{ id: string; cells?: Record<string, unknown> }>;
    };
    return payload.records?.[0] ?? payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
