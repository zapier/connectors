#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  chatMemberSchema,
  TELEGRAM_API,
  throwTelegramError,
} from "../lib/telegram.ts";

const inputSchema = z
  .object({
    chat_id: z.string().describe("Chat to look in — numeric id or @username."),
    user_id: z
      .number()
      .int()
      .describe(
        "Numeric Telegram user id (from message senders, getChatAdministrators, or listRecentChats).",
      ),
  })
  .strict();

const definition = defineTool({
  name: "getChatMember",
  title: "Get Chat Member",
  description:
    "Get a chat member's status and role — e.g. whether a user is an admin or still a member of the chat.",
  inputSchema,
  outputSchema: chatMemberSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "telegram",
  run: async (input, ctx) => {
    const url = `${TELEGRAM_API}/getChatMember`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.user_id !== undefined) body["user_id"] = input.user_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) await throwTelegramError("getChatMember", res);
    const { result } = (await res.json()) as { result: unknown };
    return result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
