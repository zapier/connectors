#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { okResultSchema, readTelegram, TELEGRAM_API } from "../lib/telegram.ts";

const inputSchema = z
  .object({
    chat_id: z
      .string()
      .describe("Chat containing the message — numeric id or @username."),
    message_id: z
      .number()
      .int()
      .describe("message_id of the message to delete."),
  })
  .strict();

const definition = defineTool({
  name: "deleteMessage",
  title: "Delete Message",
  description:
    "Delete a message from a chat. The bot can delete its own messages, or others' with admin rights, within Telegram's time window.",
  inputSchema,
  outputSchema: okResultSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "telegram",
  run: async (input, ctx) => {
    const url = `${TELEGRAM_API}/deleteMessage`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.message_id !== undefined) body["message_id"] = input.message_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readTelegram("deleteMessage", res);
    return { ok: data.ok };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
