#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { nameContains, TRELLO_BASE, trelloError } from "../lib/trello.ts";

const inputSchema = z
  .object({
    id: z.string().describe("24-char hex board id."),
    name: z.string(),
  })
  .strict();
const itemSchema = z.array(
  z.object({
    id: z
      .string()
      .regex(new RegExp("^[0-9a-fA-F]{24}$"))
      .describe("Trello object id (24 hex chars)."),
    idBoard: z.string(),
    name: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
  }),
);
const outputSchema = z.object({ items: itemSchema });

const definition = defineTool({
  name: "findLabel",
  title: "Find Label",
  description: "Find labels on a board whose name contains the search string.",
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
    const url = `${TRELLO_BASE}/boards/${encodeURIComponent(input.id)}/labels`;
    const res = await ctx.fetch(url, { method: "GET" });
    if (!res.ok) await trelloError("findLabel", res);
    const labels = (await res.json()) as Array<{ name?: string | null }>;
    const items = (Array.isArray(labels) ? labels : []).filter((label) =>
      nameContains(label.name ?? "", input.name),
    );
    return { items };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
