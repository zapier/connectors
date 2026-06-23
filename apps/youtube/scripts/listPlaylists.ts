#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  NextPageToken,
  PlaylistSchema,
  throwForYouTube,
} from "../lib/youtube.ts";

const inputSchema = z
  .object({
    part: z
      .string()
      .describe("Resource parts to return. Leave as the default.")
      .default("snippet,contentDetails,status"),
    mine: z
      .boolean()
      .describe(
        "List the authenticated user's own playlists. The default when no channelId or id is given.",
      )
      .optional(),
    channelId: z
      .string()
      .describe(
        "List playlists owned by this channel id (UC...). Mutually exclusive with mine and id.",
      )
      .optional(),
    id: z
      .string()
      .describe(
        "Fetch specific playlists by id (comma-separated, max 50). Mutually exclusive with mine and channelId.",
      )
      .optional(),
    maxResults: z
      .number()
      .int()
      .gte(1)
      .lte(50)
      .describe(
        "Max playlists per page (1-50). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
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
  items: z.array(PlaylistSchema).describe("The playlists."),
  next_page_token: NextPageToken,
});

const definition = defineTool({
  name: "listPlaylists",
  title: "List Playlists",
  description:
    "List playlists owned by the authenticated user (default) or by a channel, or fetch specific playlists by id. The resolver for any playlistId input.",
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
    const url = new URL(`https://www.googleapis.com/youtube/v3/playlists`);
    if (input.part !== undefined) {
      url.searchParams.set("part", String(input.part));
    }
    if (input.mine !== undefined) {
      url.searchParams.set("mine", String(input.mine));
    }
    if (input.channelId !== undefined) {
      url.searchParams.set("channelId", String(input.channelId));
    }
    if (input.id !== undefined) {
      url.searchParams.set("id", String(input.id));
    }
    url.searchParams.set("maxResults", String(input.maxResults ?? 20));
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwForYouTube(res, "listPlaylists");
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
