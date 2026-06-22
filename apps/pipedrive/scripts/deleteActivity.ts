#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readPipedrive } from "../lib/pipedrive.ts";

const inputSchema = z
  .object({ id: z.number().int().describe("Activity id to delete.") })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Id of the deleted record."),
});

const definition = defineTool({
  name: "deleteActivity",
  title: "Delete Activity",
  description:
    "Delete an activity by id. Deleting an already-deleted activity returns not-found.",
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
    const url = `https://api.pipedrive.com/api/v2/activities/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    const wire = await readPipedrive("deleteActivity", res);
    return wire.data;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
