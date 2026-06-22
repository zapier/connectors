#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z.object({ idCard: z.string(), name: z.string() }).strict();
const outputSchema = z.object({
  id: z
    .string()
    .regex(new RegExp("^[0-9a-fA-F]{24}$"))
    .describe("Trello object id (24 hex chars)."),
  name: z.string(),
  idCard: z.string().nullable().optional(),
});

const definition = defineTool({
  name: "createChecklist",
  title: "Create Checklist",
  description: "Create a checklist on a card.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "trello",
  run: async (input, ctx) => {
    const url = `https://api.trello.com/1/checklists`;
    const body: Record<string, unknown> = {};
    if (input.idCard !== undefined) body["idCard"] = input.idCard;
    if (input.name !== undefined) body["name"] = input.name;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello createChecklist ${res.status}: ${errBody}`);
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
