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
        "Target chat — numeric id or @username. The bot must be a member.",
      ),
    phone_number: z.string().describe("Contact's phone number."),
    first_name: z.string().describe("Contact's first name."),
    last_name: z.string().describe("Contact's last name.").optional(),
    vcard: z
      .string()
      .describe("Additional contact data as a vCard, 0–2048 bytes.")
      .optional(),
    disable_notification: z
      .boolean()
      .describe("Send silently. Default false.")
      .optional(),
    protect_content: z
      .boolean()
      .describe("Protect from forwarding and saving. Default false.")
      .optional(),
    message_thread_id: z
      .number()
      .int()
      .describe("Target a forum-supergroup topic.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "sendContact",
  title: "Send Contact",
  description: "Send a phone contact to a chat.",
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
    const url = `${TELEGRAM_API}/sendContact`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.phone_number !== undefined)
      body["phone_number"] = input.phone_number;
    if (input.first_name !== undefined) body["first_name"] = input.first_name;
    if (input.last_name !== undefined) body["last_name"] = input.last_name;
    if (input.vcard !== undefined) body["vcard"] = input.vcard;
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
    const data = await readTelegram("sendContact", res);
    return data.result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
