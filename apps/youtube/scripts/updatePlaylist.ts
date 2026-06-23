#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { PlaylistSchema, throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    id: z.string().describe("The id of the playlist to update."),
    snippet: z
      .object({
        title: z
          .string()
          .describe("Playlist title (required). Max 150 characters."),
        description: z
          .string()
          .describe("Playlist description. Max 5000 characters.")
          .optional(),
        defaultLanguage: z
          .string()
          .describe(
            "BCP-47 language code of the title/description text, e.g. en.",
          )
          .optional(),
      })
      .strict(),
    status: z
      .object({
        privacyStatus: z
          .enum(["public", "unlisted", "private"])
          .describe("Playlist visibility. Defaults to private if omitted.")
          .optional(),
      })
      .strict()
      .optional(),
    part: z
      .string()
      .describe("Resource parts being written. Leave as the default.")
      .default("snippet,status"),
  })
  .strict();
const outputSchema = PlaylistSchema;

const definition = defineTool({
  name: "updatePlaylist",
  title: "Update Playlist",
  description:
    "Update a playlist's title, description, or privacy. Send the complete desired snippet — omitted fields within a written part are reset (the API replaces, not merges). Resolve id via listPlaylists.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/playlists`);
    if (input.part !== undefined) {
      url.searchParams.set("part", String(input.part));
    }
    const body: Record<string, unknown> = {};
    if (input.id !== undefined) body["id"] = input.id;
    if (input.snippet !== undefined) body["snippet"] = input.snippet;
    if (input.status !== undefined) body["status"] = input.status;
    const res = await ctx.fetch(url.toString(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwForYouTube(res, "updatePlaylist");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
