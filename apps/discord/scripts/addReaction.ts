#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    channel_id: z.string().describe("Channel or thread id (a snowflake)."),
    message_id: z.string().describe("Message id (a snowflake)."),
    emoji: z
      .string()
      .describe(
        "A unicode emoji character (e.g. 👍) or a custom emoji as name:id (e.g. blob:12345). Resolve custom emoji via listEmojis.",
      ),
  })
  .strict();
const outputSchema = z.object({ status: z.number() });

const definition = defineTool({
  name: "addReaction",
  title: "Add Reaction",
  description:
    "Add the bot's reaction to a message. emoji is a URL-encoded unicode emoji (e.g. 👍) or a custom emoji as name:id (resolve custom via listEmojis).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "discord",
  run: async (input, ctx) => {
    const url = `https://discord.com/api/v10/channels/${encodeURIComponent(input.channel_id)}/messages/${encodeURIComponent(input.message_id)}/reactions/${encodeURIComponent(input.emoji)}/@me`;
    const res = await ctx.fetch(url, {
      method: "PUT",
    });
    await throwIfNotOk(res, "Discord addReaction");
    return { status: res.status };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
