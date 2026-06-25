#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { CaptionSchema, throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    part: z
      .string()
      .describe("Resource parts to return. Leave as the default.")
      .default("snippet"),
    videoId: z.string().describe("The video id whose caption tracks to list."),
  })
  .strict();
const outputSchema = z.object({
  items: z.array(CaptionSchema).describe("The caption tracks for the video."),
});

const definition = defineTool({
  name: "listCaptions",
  title: "List Captions",
  description:
    "List the caption tracks available for a video (id, language, name, type, status). Use the track id with downloadCaption to fetch the text. Requires the youtube.force-ssl scope.",
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
    const url = new URL(`https://www.googleapis.com/youtube/v3/captions`);
    if (input.part !== undefined) {
      url.searchParams.set("part", String(input.part));
    }
    if (input.videoId !== undefined) {
      url.searchParams.set("videoId", String(input.videoId));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwForYouTube(res, "listCaptions");
    const payload = (await res.json()) as { items?: unknown };
    return { items: payload.items ?? [] };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
