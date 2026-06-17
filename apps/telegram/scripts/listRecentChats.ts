#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { chatSchema, readTelegram, TELEGRAM_API } from "../lib/telegram.ts";

const inputSchema = z
  .object({
    limit: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "How many recent updates to scan for chats (1–100). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  chats: z
    .array(chatSchema)
    .describe(
      "Distinct chats the bot has seen in recent updates. Use a chat's id (or username) as chat_id in send/manage tools.",
    ),
});

interface TelegramUpdate {
  message?: { chat?: z.infer<typeof chatSchema> };
  channel_post?: { chat?: z.infer<typeof chatSchema> };
}

const definition = defineTool({
  name: "listRecentChats",
  title: "List Recent Chats",
  description:
    "List chats the bot has recently interacted with — the primary way to discover chat_ids you can message. Fails if a webhook is active on the bot.",
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
    // getUpdates is Telegram's long-polling feed; we use it read-only to surface
    // the distinct chats that have recently messaged the bot. allowed_updates
    // limits the feed to message + channel_post so we only scan chat-bearing updates.
    const res = await ctx.fetch(`${TELEGRAM_API}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        limit: input.limit ?? 20,
        allowed_updates: ["message", "channel_post"],
      }),
    });
    const data = await readTelegram("listRecentChats", res);
    const result = (data.result ?? []) as TelegramUpdate[];

    // Extract the chat from each update and de-dupe by id (most recent first).
    const seen = new Map<number, z.infer<typeof chatSchema>>();
    for (const update of [...result].reverse()) {
      const chat = update.message?.chat ?? update.channel_post?.chat;
      if (chat && !seen.has(chat.id)) seen.set(chat.id, chat);
    }
    return { chats: [...seen.values()] };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
