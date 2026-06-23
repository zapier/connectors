#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { PlaylistSchema, throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({
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
  name: "createPlaylist",
  title: "Create Playlist",
  description:
    "Create a new playlist on the authenticated user's channel. Returns the new playlist id for addVideoToPlaylist.",
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
    const url = new URL(`https://www.googleapis.com/youtube/v3/playlists`);
    if (input.part !== undefined) {
      url.searchParams.set("part", String(input.part));
    }
    const body: Record<string, unknown> = {};
    if (input.snippet !== undefined) body["snippet"] = input.snippet;
    if (input.status !== undefined) body["status"] = input.status;
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwForYouTube(res, "createPlaylist");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
