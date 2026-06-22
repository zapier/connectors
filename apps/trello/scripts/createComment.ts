#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    id: z.string().describe("24-char hex card id."),
    text: z
      .string()
      .describe(
        "Comment body (Trello Markdown; @member mentions use @username).",
      ),
  })
  .strict();
const outputSchema = z.object({
  id: z
    .string()
    .regex(new RegExp("^[0-9a-fA-F]{24}$"))
    .describe("Trello object id (24 hex chars)."),
  type: z.string(),
  date: z.string().datetime({ offset: true }),
  data: z
    .object({
      text: z.string().nullable().optional(),
      card: z
        .object({
          id: z.string().nullable().optional(),
          name: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

const definition = defineTool({
  name: "createComment",
  title: "Create Comment",
  description: "Add a comment to a card.",
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
    const url = `https://api.trello.com/1/cards/${encodeURIComponent(input.id)}/actions/comments`;
    const body: Record<string, unknown> = {};
    if (input.text !== undefined) body["text"] = input.text;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Trello createComment ${res.status}: ${errBody}`);
    }
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
