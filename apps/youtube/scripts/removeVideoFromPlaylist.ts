#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SuccessResultSchema, throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    id: z
      .string()
      .describe(
        "The playlistItem id to remove (the item's own id from listPlaylistItems, not the video id).",
      ),
  })
  .strict();
const outputSchema = SuccessResultSchema;

const definition = defineTool({
  name: "removeVideoFromPlaylist",
  title: "Remove Video From Playlist",
  description:
    "Remove an item from a playlist. The id is the playlistItem id (NOT the video id) — get it from listPlaylistItems.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    // Reversible — the video can be re-added with addVideoToPlaylist.
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/playlistItems`);
    if (input.id !== undefined) {
      url.searchParams.set("id", String(input.id));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "DELETE",
    });
    await throwForYouTube(res, "removeVideoFromPlaylist");
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
