#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z.object({ id: z.string() }).strict();
const outputSchema = z.object({ status: z.number() });

const definition = defineTool({
  name: "deleteChecklist",
  title: "Delete Checklist",
  description: "Delete a checklist.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "trello",
  run: async (input, ctx) => {
    const url = `https://api.trello.com/1/checklists/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello deleteChecklist ${res.status}: ${errBody}`);
    }
    return { status: res.status };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
