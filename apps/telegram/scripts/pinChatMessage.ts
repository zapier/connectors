#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  okResultSchema,
  TELEGRAM_API,
  throwTelegramError,
} from "../lib/telegram.ts";

const inputSchema = z
  .object({
    chat_id: z
      .string()
      .describe("Chat containing the message — numeric id or @username."),
    message_id: z.number().int().describe("message_id of the message to pin."),
    disable_notification: z
      .boolean()
      .describe("Pin without notifying members. Default false.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "pinChatMessage",
  title: "Pin Chat Message",
  description:
    "Pin a message in a chat. Requires can_pin_messages admin right in groups/channels.",
  inputSchema,
  outputSchema: okResultSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "telegram",
  run: async (input, ctx) => {
    const url = `${TELEGRAM_API}/pinChatMessage`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.message_id !== undefined) body["message_id"] = input.message_id;
    if (input.disable_notification !== undefined)
      body["disable_notification"] = input.disable_notification;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) await throwTelegramError("pinChatMessage", res);
    const { ok } = (await res.json()) as { ok: boolean };
    return { ok };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
