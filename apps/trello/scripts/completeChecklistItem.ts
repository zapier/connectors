#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    id: z.string().describe("24-char hex card id."),
    idCheckItem: z.string(),
    state: z.enum(["complete", "incomplete"]),
  })
  .strict();
const outputSchema = z.object({
  id: z
    .string()
    .regex(new RegExp("^[0-9a-fA-F]{24}$"))
    .describe("Trello object id (24 hex chars)."),
  name: z.string(),
  state: z.enum(["complete", "incomplete"]),
  idChecklist: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "completeChecklistItem",
  title: "Complete Checklist Item",
  description: "Mark a checklist item complete or incomplete.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "trello",
  run: async (input, ctx) => {
    const url = `https://api.trello.com/1/cards/${encodeURIComponent(input.id)}/checkItem/${encodeURIComponent(input.idCheckItem)}`;
    const body: Record<string, unknown> = {};
    if (input.state !== undefined) body["state"] = input.state;
    const res = await ctx.fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello completeChecklistItem ${res.status}: ${errBody}`);
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
