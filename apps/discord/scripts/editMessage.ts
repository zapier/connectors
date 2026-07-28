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
    message_id: z
      .string()
      .describe(
        "Message id to edit (a snowflake). The bot can only edit its own messages.",
      ),
    content: z
      .string()
      .describe(
        "New message text, up to 2000 characters. Discord-flavored Markdown. See the formatting reference.",
      ),
  })
  .strict();
const outputSchema = z
  .object({
    id: z
      .string()
      .describe(
        "Message id (a snowflake). Pass to getMessage / editMessage / deleteMessage / addReaction.",
      ),
    channel_id: z
      .string()
      .describe("Channel or thread the message is in (a snowflake)."),
    content: z.string().describe("The message text."),
    timestamp: z
      .string()
      .datetime({ offset: true })
      .describe("When the message was sent (ISO 8601)."),
    edited_timestamp: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .describe("When the message was last edited, if ever (ISO 8601).")
      .optional(),
    tts: z
      .boolean()
      .nullable()
      .describe("Whether this was a text-to-speech message.")
      .optional(),
    pinned: z
      .boolean()
      .nullable()
      .describe("Whether this message is pinned in its channel.")
      .optional(),
    author: z
      .object({
        id: z.string().describe("Unique user id (a snowflake)."),
        username: z
          .string()
          .describe("The user's username, not unique across the platform."),
        global_name: z
          .string()
          .nullable()
          .describe("The user's display name, if set.")
          .optional(),
        discriminator: z
          .string()
          .nullable()
          .describe(
            'Legacy 4-digit tag; "0" for users migrated to the new username system.',
          )
          .optional(),
        bot: z
          .boolean()
          .nullable()
          .describe("True if this user is a bot.")
          .optional(),
        avatar: z
          .string()
          .nullable()
          .describe("Avatar hash, if the user has a custom avatar.")
          .optional(),
      })
      .nullable()
      .describe("A Discord user or bot.")
      .optional(),
  })
  .describe("A message in a channel or thread.");

const definition = defineTool({
  name: "editMessage",
  title: "Edit Message",
  description: "Edit the content of a message the bot previously sent.",
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
    const url = `https://discord.com/api/v10/channels/${encodeURIComponent(input.channel_id)}/messages/${encodeURIComponent(input.message_id)}`;
    const body: Record<string, unknown> = {};
    if (input.content !== undefined) body["content"] = input.content;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Discord editMessage");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
