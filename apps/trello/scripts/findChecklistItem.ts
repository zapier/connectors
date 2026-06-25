#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { nameContains, TRELLO_BASE, trelloError } from "../lib/trello.ts";

const inputSchema = z.object({ id: z.string(), name: z.string() }).strict();
const itemSchema = z.array(
  z.object({
    id: z
      .string()
      .regex(new RegExp("^[0-9a-fA-F]{24}$"))
      .describe("Trello object id (24 hex chars)."),
    name: z.string(),
    state: z.enum(["complete", "incomplete"]),
    idChecklist: z.string().nullable().optional(),
  }),
);
const outputSchema = z.object({ items: itemSchema });

const definition = defineTool({
  name: "findChecklistItem",
  title: "Find Checklist Item",
  description: "Find checklist items whose name contains the search string.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "trello",
  run: async (input, ctx) => {
    const url = `${TRELLO_BASE}/checklists/${encodeURIComponent(input.id)}/checkItems`;
    const res = await ctx.fetch(url, { method: "GET" });
    if (!res.ok) await trelloError("findChecklistItem", res);
    const checkItems = (await res.json()) as Array<{ name?: string }>;
    const items = (Array.isArray(checkItems) ? checkItems : []).filter((item) =>
      nameContains(item.name ?? "", input.name),
    );
    return { items };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
