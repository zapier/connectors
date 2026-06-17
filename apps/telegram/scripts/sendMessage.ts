#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { messageSchema, readTelegram, TELEGRAM_API } from "../lib/telegram.ts";

const inputSchema = z
  .object({
    chat_id: z
      .string()
      .describe(
        "Target chat — numeric id (supergroups/channels are -100-prefixed, e.g. -1001234567890) or @username. Resolve via listRecentChats / getChat.",
      ),
    text: z
      .string()
      .describe(
        "Message text, 1–4096 characters. Longer text is rejected by the API; chunk it yourself.",
      ),
    parse_mode: z
      .enum(["HTML", "MarkdownV2", "Markdown"])
      .describe(
        "Formatting mode. Prefer HTML: tags <b><i><u><s><a href><code><pre><blockquote>; escape < > &. MarkdownV2 must escape _*[]()~`>#+-=|{}.! See the formatting reference.",
      )
      .optional(),
    disable_link_preview: z
      .boolean()
      .describe(
        "Disable the link preview for URLs in the message. Default false.",
      )
      .optional(),
    disable_notification: z
      .boolean()
      .describe(
        "Send silently — recipients get no sound notification. Default false.",
      )
      .optional(),
    protect_content: z
      .boolean()
      .describe(
        "Protect the message from forwarding and saving. Default false.",
      )
      .optional(),
    reply_to_message_id: z
      .number()
      .int()
      .describe("message_id of a message in this chat to reply to.")
      .optional(),
    message_thread_id: z
      .number()
      .int()
      .describe("Target a specific topic in a forum supergroup.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "sendMessage",
  title: "Send Message",
  description:
    "Send a text message to a Telegram chat. Use HTML parse_mode for safe formatting. chat_id is a numeric id or @username; the bot must be a member.",
  inputSchema,
  outputSchema: messageSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "telegram",
  run: async (input, ctx) => {
    const body: Record<string, unknown> = {
      chat_id: input.chat_id,
      text: input.text,
    };
    if (input.parse_mode !== undefined) body["parse_mode"] = input.parse_mode;
    // Agent-facing disable_link_preview maps to the wire's link_preview_options.is_disabled.
    if (input.disable_link_preview !== undefined)
      body["link_preview_options"] = {
        is_disabled: input.disable_link_preview,
      };
    if (input.disable_notification !== undefined)
      body["disable_notification"] = input.disable_notification;
    if (input.protect_content !== undefined)
      body["protect_content"] = input.protect_content;
    // Agent-facing reply_to_message_id maps to the modern reply_parameters.message_id.
    if (input.reply_to_message_id !== undefined)
      body["reply_parameters"] = { message_id: input.reply_to_message_id };
    if (input.message_thread_id !== undefined)
      body["message_thread_id"] = input.message_thread_id;

    const res = await ctx.fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readTelegram("sendMessage", res);
    return data.result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
