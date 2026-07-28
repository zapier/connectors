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
    channel_id: z
      .string()
      .describe(
        "Target channel, thread, or forum-post id (a snowflake). Resolve via listChannels / listActiveThreads.",
      ),
    content: z
      .string()
      .describe(
        "Message text, up to 2000 characters. Discord-flavored Markdown. Mentions: <@USER_ID> user, <#CHANNEL_ID> channel, <@&ROLE_ID> role, <:name:ID> custom emoji. See the formatting reference.",
      ),
    tts: z
      .boolean()
      .describe("Send as a text-to-speech message. Default false.")
      .optional(),
    message_reference: z
      .object({
        message_id: z
          .string()
          .describe("Snowflake id of the message being replied to."),
      })
      .strict()
      .describe("Reply to an existing message in the same channel.")
      .optional(),
    allowed_mentions: z
      .object({
        parse: z
          .array(z.enum(["roles", "users", "everyone"]))
          .describe(
            "Which mention types are allowed to ping. Pass [] to suppress all pings.",
          )
          .optional(),
      })
      .strict()
      .describe(
        "Control which mentions in content actually ping. Omit to use Discord defaults.",
      )
      .optional(),
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
  name: "sendChannelMessage",
  title: "Send Channel Message",
  description:
    "Send a message to a channel, thread, or forum post. Pass the channel/thread id. Use message_reference to reply to an existing message.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "discord",
  run: async (input, ctx) => {
    const url = `https://discord.com/api/v10/channels/${encodeURIComponent(input.channel_id)}/messages`;
    const body: Record<string, unknown> = {};
    if (input.content !== undefined) body["content"] = input.content;
    if (input.tts !== undefined) body["tts"] = input.tts;
    if (input.message_reference !== undefined)
      body["message_reference"] = input.message_reference;
    if (input.allowed_mentions !== undefined)
      body["allowed_mentions"] = input.allowed_mentions;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Discord sendChannelMessage");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
