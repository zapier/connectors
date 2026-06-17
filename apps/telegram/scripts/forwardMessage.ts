#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  messageSchema,
  TELEGRAM_API,
  throwTelegramError,
} from "../lib/telegram.ts";

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
    message_id: z
      .number()
      .int()
      .describe("message_id of the message to forward."),
    disable_notification: z
      .boolean()
      .describe("Send silently. Default false.")
      .optional(),
    protect_content: z
      .boolean()
      .describe(
        "Protect the forwarded copy from further forwarding/saving. Default false.",
      )
      .optional(),
    message_thread_id: z
      .number()
      .int()
      .describe("Target a forum-supergroup topic in the destination.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "forwardMessage",
  title: "Forward Message",
  description:
    'Forward a message from one chat to another, keeping the "forwarded from" attribution. Use copyMessage to omit attribution.',
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
    const url = `${TELEGRAM_API}/forwardMessage`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.from_chat_id !== undefined)
      body["from_chat_id"] = input.from_chat_id;
    if (input.message_id !== undefined) body["message_id"] = input.message_id;
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
    if (!res.ok) await throwTelegramError("forwardMessage", res);
    const { result } = (await res.json()) as { result: unknown };
    return result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
