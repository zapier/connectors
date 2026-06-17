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
    message_id: z
      .number()
      .int()
      .describe(
        "message_id to unpin. Omit to unpin the most recent pinned message.",
      )
      .optional(),
  })
  .strict();

const definition = defineTool({
  name: "unpinChatMessage",
  title: "Unpin Chat Message",
  description:
    "Unpin a message in a chat. Omit message_id to unpin the most recent pinned message.",
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
    const url = `${TELEGRAM_API}/unpinChatMessage`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    if (input.message_id !== undefined) body["message_id"] = input.message_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) await throwTelegramError("unpinChatMessage", res);
    const { ok } = (await res.json()) as { ok: boolean };
    return { ok };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
