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
    webhook_id: z
      .string()
      .describe(
        "Webhook id (a snowflake), from createWebhook / listChannelWebhooks.",
      ),
    webhook_token: z
      .string()
      .describe("Webhook token, from createWebhook / listChannelWebhooks."),
    content: z
      .string()
      .describe(
        "Message text, up to 2000 characters. Discord-flavored Markdown. See the formatting reference.",
      ),
    username: z
      .string()
      .describe("Override the webhook's default display name for this message.")
      .optional(),
    avatar_url: z
      .string()
      .describe(
        "Override the webhook's default avatar for this message (an image URL).",
      )
      .optional(),
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
  name: "executeWebhook",
  title: "Execute Webhook",
  description:
    "Post a message through a channel webhook, optionally as a custom username/avatar. Needs no bot membership in the channel — the webhook id + token are the credential (from createWebhook / listChannelWebhooks).",
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
    const url = new URL(
      `https://discord.com/api/v10/webhooks/${encodeURIComponent(input.webhook_id)}/${encodeURIComponent(input.webhook_token)}`,
    );
    // Always wait=true so the API returns the created message (matching the
    // output schema); without it Discord returns an empty 204.
    url.searchParams.set("wait", "true");
    const body: Record<string, unknown> = {};
    if (input.content !== undefined) body["content"] = input.content;
    if (input.username !== undefined) body["username"] = input.username;
    if (input.avatar_url !== undefined) body["avatar_url"] = input.avatar_url;
    if (input.tts !== undefined) body["tts"] = input.tts;
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Discord executeWebhook");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
