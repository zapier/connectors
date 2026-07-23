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
    recordId: z.string().describe("Record id, from findRecord or listRecords."),
    cells: z
      .record(z.string(), z.any())
      .describe(
        "Cell values keyed by field id (f_...). Scalars take a plain value; a select field takes { optionIds: [id] } (ids from getTable); a users field takes { userIds: [id] } (ids from listWorkspaceUsers).",
      ),
  })
  .strict();
// Clay's update endpoint returns only an acknowledgement (e.g.
// { message: "Record updates enqueued" }) — updates are applied
// asynchronously and the updated record is NOT echoed back. Model that ack and
// echo the recordId so the result identifies the row that was updated.
const outputSchema = z.object({
  recordId: z
    .string()
    .describe("The id of the record whose update was enqueued."),
  message: z
    .string()
    .nullable()
    .describe(
      "Server acknowledgement. Updates are enqueued and applied asynchronously; re-read with findRecord/listRecords to confirm.",
    )
    .optional(),
});

const definition = defineTool({
  name: "updateRecord",
  title: "Update Record",
  description:
    "Update cell values on an existing row. Only the cell keys you include change. Get recordId from findRecord or listRecords; cell keys from getTable.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "clay",
  run: async (input, ctx) => {
    const url = `https://api.clay.com/v3/tables/${encodeURIComponent(input.tableId)}/records/${encodeURIComponent(input.recordId)}`;
    // The PATCH body is the cells map sent directly (no envelope).
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.cells),
    });
    await throwIfNotOk(res, "Clay updateRecord");
    // The API returns only an ack ({ message }), not the record. Echo the
    // recordId so the result identifies which row was updated.
    const body = (await res.json()) as { message?: string };
    return { recordId: input.recordId, message: body.message };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
