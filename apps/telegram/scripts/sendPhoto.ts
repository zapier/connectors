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
        "Target chat — numeric id or @username. The bot must be a member.",
      ),
    photo: z
      .string()
      .describe(
        "HTTPS URL of the photo (≤5 MB) or a Telegram file_id from a previous message.",
      ),
    caption: z
      .string()
      .describe("Photo caption, 0–1024 characters.")
      .optional(),
    parse_mode: z
      .enum(["HTML", "MarkdownV2", "Markdown"])
      .describe(
        "Formatting mode for the caption. Prefer HTML — see the formatting reference.",
      )
      .optional(),
    has_spoiler: z
      .boolean()
      .describe("Cover the photo with a spoiler animation. Default false.")
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
  name: "sendPhoto",
  title: "Send Photo",
  description:
    "Send a photo to a chat. Provide an HTTPS URL (≤5 MB) or a Telegram file_id; uploading local bytes is not supported.",
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
    const url = `${TELEGRAM_API}/sendPhoto`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.photo !== undefined) body["photo"] = input.photo;
    if (input.caption !== undefined) body["caption"] = input.caption;
    if (input.parse_mode !== undefined) body["parse_mode"] = input.parse_mode;
    if (input.has_spoiler !== undefined)
      body["has_spoiler"] = input.has_spoiler;
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
    if (!res.ok) await throwTelegramError("sendPhoto", res);
    const { result } = (await res.json()) as { result: unknown };
    return result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
