#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { messageSchema, readTelegram, TELEGRAM_API } from "../lib/telegram.ts";

const inputSchema = z
  .object({
    chat_id: z
      .string()
      .describe("Chat containing the message — numeric id or @username."),
    message_id: z
      .number()
      .int()
      .describe(
        "message_id of the message to edit (from the original send response).",
      ),
    text: z.string().describe("New message text, 1–4096 characters."),
    parse_mode: z
      .enum(["HTML", "MarkdownV2", "Markdown"])
      .describe("Formatting mode. Prefer HTML.")
      .optional(),
    disable_link_preview: z
      .boolean()
      .describe("Disable the link preview. Default false.")
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "editMessageText",
  title: "Edit Message Text",
  description: "Edit the text of a message the bot previously sent in a chat.",
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
    const url = `${TELEGRAM_API}/editMessageText`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.message_id !== undefined) body["message_id"] = input.message_id;
    if (input.text !== undefined) body["text"] = input.text;
    if (input.parse_mode !== undefined) body["parse_mode"] = input.parse_mode;
    if (input.disable_link_preview !== undefined)
      body["disable_link_preview"] = input.disable_link_preview;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readTelegram("editMessageText", res);
    return data.result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
