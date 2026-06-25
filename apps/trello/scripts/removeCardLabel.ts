#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    id: z.string().describe("24-char hex card id."),
    idLabel: z.string(),
  })
  .strict();
const outputSchema = z.object({ status: z.number() });

const definition = defineTool({
  name: "removeCardLabel",
  title: "Remove Card Label",
  description: "Remove a label from a card.",
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
    const url = `https://api.trello.com/1/cards/${encodeURIComponent(input.id)}/idLabels/${encodeURIComponent(input.idLabel)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello removeCardLabel ${res.status}: ${errBody}`);
    }
    return { status: res.status };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
