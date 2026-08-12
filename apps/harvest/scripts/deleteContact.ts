#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { harvestFetch } from "../lib/harvestFetch.ts";

const inputSchema = z
  .object({
    id: z.number().int().describe("Contact to delete. From listContacts."),
  })
  .strict();
const outputSchema = z.object({
  id: z.number().int().describe("Deleted contact id."),
  deleted: z.literal(true).describe("Always true on success."),
});

const definition = defineTool({
  name: "deleteContact",
  title: "Delete Contact",
  description: "Permanently delete a client contact.",
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
    const url = `https://api.harvestapp.com/v2/contacts/${encodeURIComponent(input.id)}`;
    await harvestFetch(ctx.fetch, "deleteContact", url, {
      method: "DELETE",
    });
    return { id: input.id, deleted: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
