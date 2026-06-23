#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  NextPageToken,
  SearchResultSchema,
  throwForYouTube,
} from "../lib/youtube.ts";

const inputSchema = z
  .object({
    part: z
      .string()
      .describe("Resource parts to return. Leave as the default.")
      .default("snippet"),
    type: z
      .string()
      .describe(
        "Resource type to search. Leave as the default to search videos.",
      )
      .default("video"),
    q: z
      .string()
      .describe(
        'Free-text search query. Supports the NOT (-) and OR (|) operators, e.g. "boating|sailing -fishing".',
      )
      .optional(),
    channelId: z
      .string()
      .describe(
        "Restrict results to videos uploaded by this channel id (UC...). Resolve via getChannel.",
      )
      .optional(),
    forMine: z
      .boolean()
      .describe(
        "Restrict results to the authenticated user's own videos. Requires type=video. Cannot be combined with channelId.",
      )
      .optional(),
    order: z
      .enum(["date", "rating", "relevance", "title", "videoCount", "viewCount"])
      .describe("Sort order for results.")
      .default("relevance"),
    publishedAfter: z
      .string()
      .datetime({ offset: true })
      .describe(
        "Only return videos published at or after this RFC3339 datetime, e.g. 2026-01-01T00:00:00Z.",
      )
      .optional(),
    publishedBefore: z
      .string()
      .datetime({ offset: true })
      .describe("Only return videos published before this RFC3339 datetime.")
      .optional(),
    videoDuration: z
      .enum(["any", "long", "medium", "short"])
      .describe(
        "Filter by length. short = <4 min, medium = 4-20 min, long = >20 min.",
      )
      .optional(),
    regionCode: z
      .string()
      .describe(
        "ISO 3166-1 alpha-2 country code (e.g. US, GB) to return results for.",
      )
      .optional(),
    relevanceLanguage: z
      .string()
      .describe("ISO 639-1 language code (e.g. en, es) to bias results toward.")
      .optional(),
    maxResults: z
      .number()
      .int()
      .gte(1)
      .lte(50)
      .describe(
        "Max results per page (1-50). Defaults to 10 when omitted; pass a value when you need a specific number of results.",
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
  items: z.array(SearchResultSchema).describe("The search hits."),
  next_page_token: NextPageToken,
});

const definition = defineTool({
  name: "searchVideos",
  title: "Search Videos",
  description:
    "Search YouTube for videos by keyword, channel, date, or duration. Returns lightweight results (id + snippet); call getVideo for statistics and contentDetails. Quota-heavy (100 units).",
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
    const url = new URL(`https://www.googleapis.com/youtube/v3/search`);
    if (input.part !== undefined) {
      url.searchParams.set("part", String(input.part));
    }
    if (input.type !== undefined) {
      url.searchParams.set("type", String(input.type));
    }
    if (input.q !== undefined) {
      url.searchParams.set("q", String(input.q));
    }
    if (input.channelId !== undefined) {
      url.searchParams.set("channelId", String(input.channelId));
    }
    if (input.forMine !== undefined) {
      url.searchParams.set("forMine", String(input.forMine));
    }
    if (input.order !== undefined) {
      url.searchParams.set("order", String(input.order));
    }
    if (input.publishedAfter !== undefined) {
      url.searchParams.set("publishedAfter", String(input.publishedAfter));
    }
    if (input.publishedBefore !== undefined) {
      url.searchParams.set("publishedBefore", String(input.publishedBefore));
    }
    if (input.videoDuration !== undefined) {
      url.searchParams.set("videoDuration", String(input.videoDuration));
    }
    if (input.regionCode !== undefined) {
      url.searchParams.set("regionCode", String(input.regionCode));
    }
    if (input.relevanceLanguage !== undefined) {
      url.searchParams.set(
        "relevanceLanguage",
        String(input.relevanceLanguage),
      );
    }
    url.searchParams.set("maxResults", String(input.maxResults ?? 10));
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwForYouTube(res, "searchVideos");
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
