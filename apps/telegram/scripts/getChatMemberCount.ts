#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { TELEGRAM_API, throwTelegramError } from "../lib/telegram.ts";

const inputSchema = z
  .object({
    chat_id: z.string().describe("Chat to count — numeric id or @username."),
  })
  .strict();
const outputSchema = z.object({
  count: z.number().int().describe("Number of members in the chat."),
});

const definition = defineTool({
  name: "getChatMemberCount",
  title: "Get Chat Member Count",
  description: "Get the number of members in a chat.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "telegram",
  run: async (input, ctx) => {
    const url = `${TELEGRAM_API}/getChatMemberCount`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) await throwTelegramError("getChatMemberCount", res);
    const { result } = (await res.json()) as { result: number };
    return { count: result };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
