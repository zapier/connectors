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
    message_id: z.string().describe("Message id to delete (a snowflake)."),
  })
  .strict();
const outputSchema = z.object({ status: z.number() });

const definition = defineTool({
  name: "deleteMessage",
  title: "Delete Message",
  description:
    "Delete a message from a channel or thread. The bot can delete its own messages, or others' with Manage Messages permission.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "discord",
  run: async (input, ctx) => {
    const url = `https://discord.com/api/v10/channels/${encodeURIComponent(input.channel_id)}/messages/${encodeURIComponent(input.message_id)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    await throwIfNotOk(res, "Discord deleteMessage");
    return { status: res.status };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
