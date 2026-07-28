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
        "Channel or thread id (a snowflake). Resolve via listChannels.",
      ),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Max messages to return (1–100). Defaults to 10 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    before: z
      .string()
      .describe(
        "Return messages before this message id (snowflake). Use for paging into older history.",
      )
      .optional(),
    after: z
      .string()
      .describe("Return messages after this message id (snowflake).")
      .optional(),
    around: z
      .string()
      .describe("Return messages around this message id (snowflake).")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  messages: z.array(
    z
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
          .any()
          .nullable()
          .describe("Nested User object — shape passes through.")
          .optional(),
      })
      .describe("A message in a channel or thread."),
  ),
});

const definition = defineTool({
  name: "listChannelMessages",
  title: "List Channel Messages",
  description:
    "List recent messages in a channel or thread, newest first. Use before/after to page through history.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "discord",
  run: async (input, ctx) => {
    const url = new URL(
      `https://discord.com/api/v10/channels/${encodeURIComponent(input.channel_id)}/messages`,
    );
    url.searchParams.set("limit", String(input.limit ?? 10));
    if (input.before !== undefined) {
      url.searchParams.set("before", String(input.before));
    }
    if (input.after !== undefined) {
      url.searchParams.set("after", String(input.after));
    }
    if (input.around !== undefined) {
      url.searchParams.set("around", String(input.around));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Discord listChannelMessages");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = { messages: wirePayload };
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
