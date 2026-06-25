#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  NextPageToken,
  PlaylistItemSchema,
  throwForYouTube,
} from "../lib/youtube.ts";

const inputSchema = z
  .object({
    part: z
      .string()
      .describe("Resource parts to return. Leave as the default.")
      .default("snippet,contentDetails,status"),
    playlistId: z
      .string()
      .describe(
        "The playlist id whose items to list (from listPlaylists). For a channel's uploads, use the uploads playlist id from getChannel.",
      ),
    maxResults: z
      .number()
      .int()
      .gte(1)
      .lte(50)
      .describe(
        "Max items per page (1-50). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    pageToken: z
      .string()
      .describe(
        "Page cursor from a previous response's next_page_token. Omit for the first page.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z
    .array(PlaylistItemSchema)
    .describe("The videos in the playlist, in order."),
  next_page_token: NextPageToken,
});

const definition = defineTool({
  name: "listPlaylistItems",
  title: "List Playlist Items",
  description:
    "List the videos in a playlist, in playlist order. Each item carries its own playlistItem id (needed by removeVideoFromPlaylist) plus the video id and snippet.",
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
    const url = new URL(`https://www.googleapis.com/youtube/v3/playlistItems`);
    if (input.part !== undefined) {
      url.searchParams.set("part", String(input.part));
    }
    if (input.playlistId !== undefined) {
      url.searchParams.set("playlistId", String(input.playlistId));
    }
    url.searchParams.set("maxResults", String(input.maxResults ?? 20));
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwForYouTube(res, "listPlaylistItems");
    const payload = (await res.json()) as {
      items?: unknown;
      nextPageToken?: string;
    };
    return {
      items: payload.items ?? [],
      next_page_token: payload.nextPageToken,
    };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
