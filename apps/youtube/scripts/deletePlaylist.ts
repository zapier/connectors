#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SuccessResultSchema, throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    id: z
      .string()
      .describe("The id of the playlist to delete (from listPlaylists)."),
  })
  .strict();
const outputSchema = SuccessResultSchema;

const definition = defineTool({
  name: "deletePlaylist",
  title: "Delete Playlist",
  description:
    "Permanently delete a playlist owned by the authenticated user. Irreversible.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/playlists`);
    if (input.id !== undefined) {
      url.searchParams.set("id", String(input.id));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "DELETE",
    });
    await throwForYouTube(res, "deletePlaylist");
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
