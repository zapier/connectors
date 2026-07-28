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
  })
  .strict();
const outputSchema = z.object({
  threads: z.array(
    z
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
        name: z
          .string()
          .nullable()
          .describe("Channel or thread name.")
          .optional(),
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
      ),
  ),
});

const definition = defineTool({
  name: "listActiveThreads",
  title: "List Active Threads",
  description:
    "List all active (non-archived) threads and forum posts in a server, including which channel each belongs to.",
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
    const url = `https://discord.com/api/v10/guilds/${encodeURIComponent(input.guild_id)}/threads/active`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Discord listActiveThreads");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = { threads: wirePayload.threads };
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
