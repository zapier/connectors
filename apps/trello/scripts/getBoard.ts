#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({ id: z.string().describe("24-char hex board id.") })
  .strict();
const outputSchema = z.object({
  id: z
    .string()
    .regex(new RegExp("^[0-9a-fA-F]{24}$"))
    .describe("Trello object id (24 hex chars)."),
  name: z.string(),
  desc: z.string().nullable().optional(),
  closed: z.boolean().nullable().optional(),
  idOrganization: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  shortUrl: z.string().nullable().optional(),
  dateLastActivity: z.string().datetime({ offset: true }).nullable().optional(),
});

const definition = defineTool({
  name: "getBoard",
  title: "Get Board",
  description: "Get a board by id.",
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
    const url = `https://api.trello.com/1/boards/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello getBoard ${res.status}: ${errBody}`);
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
