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
  name: "getChannel",
  title: "Get Channel",
  description: "Get a single channel or thread by id.",
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
    const url = `https://discord.com/api/v10/channels/${encodeURIComponent(input.channel_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Discord getChannel");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
