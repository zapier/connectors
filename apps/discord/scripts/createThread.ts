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
        "Parent channel id (a snowflake). A forum channel creates a forum post; a text/announcement channel creates a standalone thread. Resolve via listChannels.",
      ),
    name: z.string().describe("Thread / forum-post title (1–100 characters)."),
    message: z
      .object({
        content: z
          .string()
          .describe(
            "Body text of the opening message, up to 2000 characters. Discord-flavored Markdown.",
          ),
      })
      .strict()
      .describe(
        "Opening message. Required when the parent is a forum channel; omit for a standalone thread on a text/announcement channel.",
      )
      .optional(),
    type: z
      .number()
      .int()
      .describe(
        "Thread type for non-forum parents — 11 public thread (default), 12 private thread. Ignored for forum channels.",
      )
      .optional(),
    auto_archive_duration: z
      .number()
      .int()
      .describe(
        "Minutes of inactivity before the thread auto-archives — 60, 1440, 4320, or 10080.",
      )
      .optional(),
    applied_tags: z
      .array(z.string())
      .describe("Snowflake ids of forum tags to apply (forum channels only).")
      .optional(),
  })
  .strict();
const outputSchema = z
  .object({
    id: z
      .string()
      .describe(
        "Channel/thread id (a snowflake). Pass as channel_id to messaging tools.",
      ),
    type: z
      .number()
      .int()
      .describe(
        "Channel type — 0 text, 2 voice, 4 category, 5 announcement, 11 public thread, 15 forum.",
      ),
    name: z.string().nullable().describe("Channel or thread name.").optional(),
    guild_id: z
      .string()
      .nullable()
      .describe("Server this channel belongs to (a snowflake).")
      .optional(),
    parent_id: z
      .string()
      .nullable()
      .describe(
        "For threads, the parent channel id; for channels, the category id.",
      )
      .optional(),
    topic: z
      .string()
      .nullable()
      .describe("Channel topic/description, for text and forum channels.")
      .optional(),
  })
  .describe(
    "A channel, thread, or forum post. A thread is a channel whose parent_id points at its parent channel.",
  );

const definition = defineTool({
  name: "createThread",
  title: "Create Thread",
  description:
    "Start a thread in a channel. On a forum channel, pass message (its opening post) and name (the post title). On a text/announcement channel, omit message to start a standalone thread.",
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
    const url = `https://discord.com/api/v10/channels/${encodeURIComponent(input.channel_id)}/threads`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.message !== undefined) body["message"] = input.message;
    if (input.type !== undefined) body["type"] = input.type;
    if (input.auto_archive_duration !== undefined)
      body["auto_archive_duration"] = input.auto_archive_duration;
    if (input.applied_tags !== undefined)
      body["applied_tags"] = input.applied_tags;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Discord createThread");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
