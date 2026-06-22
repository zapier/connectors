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
    document: z
      .string()
      .describe(
        "HTTPS URL of the file (≤20 MB; .PDF/.ZIP only by URL) or a Telegram file_id.",
      ),
    caption: z
      .string()
      .describe("Document caption, 0–1024 characters.")
      .optional(),
    parse_mode: z
      .enum(["HTML", "MarkdownV2", "Markdown"])
      .describe("Formatting mode for the caption. Prefer HTML.")
      .optional(),
    disable_content_type_detection: z
      .boolean()
      .describe(
        "Disable server-side content-type detection for uploaded files. Default false.",
      )
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
  name: "sendDocument",
  title: "Send Document",
  description:
    "Send a file/document to a chat. Provide an HTTPS URL (≤20 MB; .PDF or .ZIP only) or a Telegram file_id.",
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
    const url = `${TELEGRAM_API}/sendDocument`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.document !== undefined) body["document"] = input.document;
    if (input.caption !== undefined) body["caption"] = input.caption;
    if (input.parse_mode !== undefined) body["parse_mode"] = input.parse_mode;
    if (input.disable_content_type_detection !== undefined)
      body["disable_content_type_detection"] =
        input.disable_content_type_detection;
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
    const data = await readTelegram("sendDocument", res);
    return data.result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
