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
    guild_id: z
      .string()
      .describe("Server (guild) id (a snowflake). Resolve via listGuilds."),
    name: z.string().describe("Channel name (1–100 characters)."),
    type: z
      .number()
      .int()
      .describe(
        "Channel type — 0 text, 2 voice, 4 category, 5 announcement, 15 forum. Default 0 (text).",
      )
      .optional(),
    topic: z
      .string()
      .describe("Channel topic/description (0–1024 characters).")
      .optional(),
    parent_id: z
      .string()
      .describe("Category channel id (a snowflake) to nest this channel under.")
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
  name: "createChannel",
  title: "Create Channel",
  description:
    "Create a channel in a server. Set type to choose text (0), voice (2), announcement (5), category (4), or forum (15).",
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
    const url = `https://discord.com/api/v10/guilds/${encodeURIComponent(input.guild_id)}/channels`;
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body["name"] = input.name;
    if (input.type !== undefined) body["type"] = input.type;
    if (input.topic !== undefined) body["topic"] = input.topic;
    if (input.parent_id !== undefined) body["parent_id"] = input.parent_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Discord createChannel");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
