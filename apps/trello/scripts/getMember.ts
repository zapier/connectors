#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z.object({ id: z.string() }).strict();
const outputSchema = z.object({
  id: z
    .string()
    .regex(new RegExp("^[0-9a-fA-F]{24}$"))
    .describe("Trello object id (24 hex chars)."),
  username: z.string(),
  fullName: z.string().nullable().optional(),
  initials: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  email: z
    .string()
    .nullable()
    .describe("Present only when token has account read scope.")
    .optional(),
});

const definition = defineTool({
  name: "getMember",
  title: "Get Member",
  description: "Get a member by id.",
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
    const url = `https://api.trello.com/1/members/${encodeURIComponent(input.id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello getMember ${res.status}: ${errBody}`);
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
