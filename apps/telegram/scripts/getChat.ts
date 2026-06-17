#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  chatFullInfoSchema,
  TELEGRAM_API,
  throwTelegramError,
} from "../lib/telegram.ts";

const inputSchema = z
  .object({
    chat_id: z
      .string()
      .describe(
        "Chat to look up — numeric id or @username. Works for public usernames the bot has not joined.",
      ),
  })
  .strict();

const definition = defineTool({
  name: "getChat",
  title: "Get Chat",
  description:
    "Get up-to-date information about a chat by id or @username. Use to resolve or confirm a chat before acting.",
  inputSchema,
  outputSchema: chatFullInfoSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "telegram",
  run: async (input, ctx) => {
    const res = await ctx.fetch(`${TELEGRAM_API}/getChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: input.chat_id }),
    });
    if (!res.ok) await throwTelegramError("getChat", res);
    const { result } = (await res.json()) as { result: unknown };
    return result;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
