#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { PlaylistItemSchema, throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    snippet: z
      .object({
        playlistId: z
          .string()
          .describe(
            "The id of the playlist to add the video to (from listPlaylists; you must own it).",
          ),
        resourceId: z
          .object({
            kind: z
              .string()
              .describe("Always youtube#video for adding a video.")
              .default("youtube#video"),
            videoId: z.string().describe("The 11-char id of the video to add."),
          })
          .strict()
          .describe(
            "The video to add. Set kind to youtube#video and videoId to the 11-char video id.",
          ),
        position: z
          .number()
          .int()
          .describe("0-based insert position. Omit to append at the end.")
          .optional(),
      })
      .strict(),
    part: z
      .string()
      .describe("Resource parts being written. Leave as the default.")
      .default("snippet"),
  })
  .strict();

const outputSchema = PlaylistItemSchema;

const definition = defineTool({
  name: "addVideoToPlaylist",
  title: "Add Video To Playlist",
  description:
    "Add a video to a playlist owned by the authenticated user. Resolve the playlist id via listPlaylists. Returns the new playlistItem id (distinct from the video id — use it with removeVideoFromPlaylist).",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/playlistItems`);
    url.searchParams.set("part", input.part);

    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snippet: input.snippet }),
    });
    await throwForYouTube(res, "addVideoToPlaylist");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
