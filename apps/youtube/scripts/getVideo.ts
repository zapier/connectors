#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { NextPageToken, throwForYouTube, VideoSchema } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    part: z
      .string()
      .describe("Resource parts to return. Leave as the default.")
      .default("snippet,contentDetails,statistics,status"),
    id: z
      .string()
      .describe(
        "One video id or a comma-separated list (max 50), e.g. dQw4w9WgXcQ. The 11-char id from a watch URL or searchVideos.",
      ),
    maxResults: z
      .number()
      .int()
      .gte(1)
      .lte(50)
      .describe(
        "Max results per page when listing many ids. Defaults to 10 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
  })
  .strict();

const outputSchema = z.object({
  items: z.array(VideoSchema).describe("The requested videos."),
  next_page_token: NextPageToken,
});

const definition = defineTool({
  name: "getVideo",
  title: "Get Video",
  description:
    "Get full details of one or more videos by id — snippet (title, description, tags, category), statistics (view/like/comment counts), contentDetails (ISO-8601 duration), and status (privacy, upload state). Counts come back as strings; like/comment counts are absent when the owner hides them. Resolve ids via searchVideos or a watch URL.",
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
    const url = new URL(`https://www.googleapis.com/youtube/v3/videos`);
    url.searchParams.set("part", input.part);
    url.searchParams.set("id", input.id);
    url.searchParams.set("maxResults", String(input.maxResults ?? 10));

    const res = await ctx.fetch(url.toString(), { method: "GET" });
    await throwForYouTube(res, "getVideo");
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
