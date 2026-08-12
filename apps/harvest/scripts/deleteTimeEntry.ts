#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    id: z
      .number()
      .int()
      .describe("Time entry to delete. From listTimeEntries."),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Deleted time entry id."),
  deleted: z.literal(true).describe("Always true on success."),
});

const definition = defineTool({
  name: "deleteTimeEntry",
  title: "Delete Time Entry",
  description:
    "Permanently delete a time entry. Locked or invoiced entries cannot be deleted.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "harvest",
  run: async (input, ctx) => {
    const url = `https://api.harvestapp.com/v2/time_entries/${encodeURIComponent(input.id)}`;
    await harvestFetch(ctx.fetch, "deleteTimeEntry", url, {
      method: "DELETE",
    });
    return { id: input.id, deleted: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
