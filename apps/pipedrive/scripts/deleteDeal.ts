#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({ id: z.number().int().describe("Deal id to delete.") })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Id of the deleted record."),
});

const definition = defineTool({
  name: "deleteDeal",
  title: "Delete Deal",
  description:
    "Permanently delete a deal by id. Deleting an already-deleted deal returns not-found.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "pipedrive",
  run: async (input, ctx) => {
    const url = `https://api.pipedrive.com/api/v2/deals/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    const wire = await readPipedrive("deleteDeal", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
