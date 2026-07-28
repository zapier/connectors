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
    recipient_id: z
      .string()
      .describe(
        "User id (a snowflake) to DM. Resolve via listMembers / searchMembers. The recipient generally must share a server with the bot, and may have bot DMs disabled.",
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
      .describe("The DM channel the message was sent in (a snowflake)."),
    content: z.string().describe("The message text."),
    timestamp: z
      .string()
      .datetime({ offset: true })
      .describe("When the message was sent (ISO 8601)."),
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
        bot: z
          .boolean()
          .nullable()
          .describe("True if this user is a bot.")
          .optional(),
      })
      .nullable()
      .describe("A Discord user or bot.")
      .optional(),
  })
  .describe("The direct message that was sent.");

const definition = defineTool({
  name: "sendDirectMessage",
  title: "Send Direct Message",
  description:
    "Send a direct message to a user. Opens (or reuses) the DM channel with the recipient, then posts the message. Bot DMs require a shared server and can be refused by the recipient's privacy settings.",
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
    // Step 1 — open (or reuse) the DM channel with the recipient.
    const dmRes = await ctx.fetch(
      "https://discord.com/api/v10/users/@me/channels",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: input.recipient_id }),
      },
    );
    await throwIfNotOk(dmRes, "Discord sendDirectMessage (open DM channel)");
    const dmChannel = (await dmRes.json()) as { id: string };

    // Step 2 — post the message into the DM channel.
    const body: Record<string, unknown> = { content: input.content };
    if (input.tts !== undefined) body["tts"] = input.tts;
    const msgRes = await ctx.fetch(
      `https://discord.com/api/v10/channels/${encodeURIComponent(dmChannel.id)}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    await throwIfNotOk(msgRes, "Discord sendDirectMessage (post message)");
    return msgRes.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
