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
    audio: z
      .string()
      .describe("HTTPS URL of the audio file or a Telegram file_id."),
    caption: z
      .string()
      .describe("Audio caption, 0–1024 characters.")
      .optional(),
    parse_mode: z
      .enum(["HTML", "MarkdownV2", "Markdown"])
      .describe("Formatting mode for the caption. Prefer HTML.")
      .optional(),
    duration: z
      .number()
      .int()
      .describe("Audio duration in seconds.")
      .optional(),
    performer: z.string().describe("Performer name.").optional(),
    title: z.string().describe("Track title.").optional(),
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
  name: "sendAudio",
  title: "Send Audio",
  description:
    "Send an audio file to a chat, displayed as playable music. Provide an HTTPS URL or a Telegram file_id.",
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
    const url = `${TELEGRAM_API}/sendAudio`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.audio !== undefined) body["audio"] = input.audio;
    if (input.caption !== undefined) body["caption"] = input.caption;
    if (input.parse_mode !== undefined) body["parse_mode"] = input.parse_mode;
    if (input.duration !== undefined) body["duration"] = input.duration;
    if (input.performer !== undefined) body["performer"] = input.performer;
    if (input.title !== undefined) body["title"] = input.title;
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
    if (!res.ok) await throwTelegramError("sendAudio", res);
    const { result } = (await res.json()) as { result: unknown };
    return result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
