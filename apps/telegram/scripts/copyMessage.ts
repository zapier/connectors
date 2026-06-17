#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { readTelegram, TELEGRAM_API } from "../lib/telegram.ts";

const inputSchema = z
  .object({
    chat_id: z
      .string()
      .describe(
        "Destination chat — numeric id or @username. The bot must be a member.",
      ),
    from_chat_id: z
      .string()
      .describe("Source chat the message is in — numeric id or @username."),
    message_id: z.number().int().describe("message_id of the message to copy."),
    caption: z
      .string()
      .describe("Replace the original caption, 0–1024 characters.")
      .optional(),
    parse_mode: z
      .enum(["HTML", "MarkdownV2", "Markdown"])
      .describe("Formatting mode for a replaced caption.")
      .optional(),
    disable_notification: z
      .boolean()
      .describe("Send silently. Default false.")
      .optional(),
    protect_content: z
      .boolean()
      .describe("Protect the copy from forwarding/saving. Default false.")
      .optional(),
    message_thread_id: z
      .number()
      .int()
      .describe("Target a forum-supergroup topic in the destination.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  message_id: z
    .number()
    .int()
    .describe("message_id of the copied message in the destination chat."),
});

const definition = defineTool({
  name: "copyMessage",
  title: "Copy Message",
  description:
    'Copy a message\'s content into another chat WITHOUT the "forwarded from" attribution. Returns only the new message_id.',
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "telegram",
  run: async (input, ctx) => {
    const url = `${TELEGRAM_API}/copyMessage`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.from_chat_id !== undefined)
      body["from_chat_id"] = input.from_chat_id;
    if (input.message_id !== undefined) body["message_id"] = input.message_id;
    if (input.caption !== undefined) body["caption"] = input.caption;
    if (input.parse_mode !== undefined) body["parse_mode"] = input.parse_mode;
    if (input.disable_notification !== undefined)
      body["disable_notification"] = input.disable_notification;
    if (input.protect_content !== undefined)
      body["protect_content"] = input.protect_content;
    if (input.message_thread_id !== undefined)
      body["message_thread_id"] = input.message_thread_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readTelegram("copyMessage", res);
    return data.result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
