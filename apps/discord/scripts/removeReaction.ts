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
        "The same emoji identifier used to add the reaction — a unicode character or a custom emoji as name:id.",
      ),
  })
  .strict();
const outputSchema = z.object({ status: z.number() });

const definition = defineTool({
  name: "removeReaction",
  title: "Remove Reaction",
  description:
    "Remove the bot's own reaction from a message. Pairs with addReaction.",
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
      method: "DELETE",
    });
    await throwIfNotOk(res, "Discord removeReaction");
    return { status: res.status };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
