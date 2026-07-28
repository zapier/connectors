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
    channel_id: z.string().describe("Channel id to modify (a snowflake)."),
    name: z
      .string()
      .describe("New channel name (1–100 characters).")
      .optional(),
    topic: z
      .string()
      .describe("New channel topic/description (0–1024 characters).")
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
  name: "modifyChannel",
  title: "Modify Channel",
  description:
    "Modify a channel's name and/or topic. Requires Manage Channels permission.",
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
    const url = `https://discord.com/api/v10/channels/${encodeURIComponent(input.channel_id)}`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.topic !== undefined) body["topic"] = input.topic;
    const res = await ctx.fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Discord modifyChannel");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
