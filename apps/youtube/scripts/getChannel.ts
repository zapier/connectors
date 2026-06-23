#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { ChannelSchema, throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    part: z
      .string()
      .describe("Resource parts to return. Leave as the default.")
      .default("snippet,contentDetails,statistics,brandingSettings"),
    mine: z
      .boolean()
      .describe(
        "Return the authenticated user's own channel(s). Use this to discover the caller's channel id and uploads playlist.",
      )
      .optional(),
    id: z
      .string()
      .describe("Look up channel(s) by id (UC..., comma-separated, max 50).")
      .optional(),
    forHandle: z
      .string()
      .describe(
        "Look up a channel by its @handle, e.g. @MrBeast (with or without the leading @). Mutually exclusive with mine and id.",
      )
      .optional(),
  })
  .strict()
  // Exactly one selector — the API silently ignores conflicting selectors, so make
  // the at-most-one rule explicit. (x-mutually-exclusive: [[mine, id, forHandle]])
  .refine(
    (v) =>
      [v.mine, v.id, v.forHandle].filter((x) => x !== undefined).length <= 1,
    {
      message:
        "Provide only one of mine, id, or forHandle (they are mutually exclusive).",
    },
  );
const outputSchema = z.object({
  items: z.array(ChannelSchema).describe("The requested channels."),
});

const definition = defineTool({
  name: "getChannel",
  title: "Get Channel",
  description:
    "Get a channel's profile, statistics, and uploads-playlist id. Pass mine=true for the authenticated user's channel, or a channel id / handle to look up another. The resolver for channelId and for a channel's uploads playlist.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/channels`);
    if (input.part !== undefined) {
      url.searchParams.set("part", String(input.part));
    }
    if (input.mine !== undefined) {
      url.searchParams.set("mine", String(input.mine));
    }
    if (input.id !== undefined) {
      url.searchParams.set("id", String(input.id));
    }
    if (input.forHandle !== undefined) {
      url.searchParams.set("forHandle", String(input.forHandle));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwForYouTube(res, "getChannel");
    const payload = (await res.json()) as { items?: unknown };
    return { items: payload.items ?? [] };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
