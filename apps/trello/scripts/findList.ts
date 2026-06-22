#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

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
    name: z.string(),
    closed: z.boolean().nullable().optional(),
    idBoard: z.string(),
    pos: z.number().nullable().optional(),
  }),
);
const outputSchema = z.object({ items: itemSchema });

const definition = defineTool({
  name: "findList",
  title: "Find List",
  description: "Find lists on a board whose name contains the search string.",
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
    const url = new URL(
      `https://api.trello.com/1/_agent/boards/${encodeURIComponent(input.id)}/lists/find`,
    );
    if (input.name !== undefined) {
      url.searchParams.set("name", String(input.name));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello findList ${res.status}: ${errBody}`);
    }
    const data = await res.json();
    return { items: data };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
