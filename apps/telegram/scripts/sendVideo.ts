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
    video: z.string().describe("HTTPS URL of the video or a Telegram file_id."),
    caption: z
      .string()
      .describe("Video caption, 0–1024 characters.")
      .optional(),
    parse_mode: z
      .enum(["HTML", "MarkdownV2", "Markdown"])
      .describe("Formatting mode for the caption. Prefer HTML.")
      .optional(),
    duration: z
      .number()
      .int()
      .describe("Video duration in seconds.")
      .optional(),
    width: z.number().int().describe("Video width.").optional(),
    height: z.number().int().describe("Video height.").optional(),
    has_spoiler: z
      .boolean()
      .describe("Cover the video with a spoiler animation. Default false.")
      .optional(),
    supports_streaming: z
      .boolean()
      .describe("Mark the video as suitable for streaming. Default false.")
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
  name: "sendVideo",
  title: "Send Video",
  description:
    "Send a video to a chat. Provide an HTTPS URL or a Telegram file_id.",
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
    const url = `${TELEGRAM_API}/sendVideo`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.video !== undefined) body["video"] = input.video;
    if (input.caption !== undefined) body["caption"] = input.caption;
    if (input.parse_mode !== undefined) body["parse_mode"] = input.parse_mode;
    if (input.duration !== undefined) body["duration"] = input.duration;
    if (input.width !== undefined) body["width"] = input.width;
    if (input.height !== undefined) body["height"] = input.height;
    if (input.has_spoiler !== undefined)
      body["has_spoiler"] = input.has_spoiler;
    if (input.supports_streaming !== undefined)
      body["supports_streaming"] = input.supports_streaming;
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
    const data = await readTelegram("sendVideo", res);
    return data.result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
