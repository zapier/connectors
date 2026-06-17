#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  chatMemberSchema,
  readTelegram,
  TELEGRAM_API,
} from "../lib/telegram.ts";

const inputSchema = z
  .object({
    chat_id: z.string().describe("Chat to inspect — numeric id or @username."),
  })
  .strict();
const outputSchema = z.object({
  administrators: z
    .array(chatMemberSchema)
    .describe("The chat's administrators (creator + administrators)."),
});

const definition = defineTool({
  name: "getChatAdministrators",
  title: "Get Chat Administrators",
  description:
    'List the administrators of a chat. A resolver for admin user_ids and for "who runs this group".',
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "telegram",
  run: async (input, ctx) => {
    const url = `${TELEGRAM_API}/getChatAdministrators`;
    const body: Record<string, unknown> = {};
    if (input.chat_id !== undefined) body["chat_id"] = input.chat_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readTelegram("getChatAdministrators", res);
    return { administrators: data.result };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
