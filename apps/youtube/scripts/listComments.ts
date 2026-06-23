#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  CommentThreadSchema,
  NextPageToken,
  throwForYouTube,
} from "../lib/youtube.ts";

const inputSchema = z
  .object({
    part: z
      .string()
      .describe("Resource parts to return. Leave as the default.")
      .default("snippet,replies"),
    videoId: z.string().describe("The video id whose comment threads to list."),
    order: z
      .enum(["time", "relevance"])
      .describe("time = newest first; relevance = YouTube's relevance ranking.")
      .default("time"),
    searchTerms: z
      .string()
      .describe("Only return comment threads matching this text.")
      .optional(),
    maxResults: z
      .number()
      .int()
      .gte(1)
      .lte(100)
      .describe(
        "Max threads per page (1-100). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
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
  items: z.array(CommentThreadSchema).describe("The comment threads."),
  next_page_token: NextPageToken,
});

const definition = defineTool({
  name: "listComments",
  title: "List Comments",
  description:
    "List top-level comment threads on a video (each with its first replies). Use to read what viewers commented. Resolve videoId via searchVideos/getVideo.",
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
    const url = new URL(`https://www.googleapis.com/youtube/v3/commentThreads`);
    if (input.part !== undefined) {
      url.searchParams.set("part", String(input.part));
    }
    if (input.videoId !== undefined) {
      url.searchParams.set("videoId", String(input.videoId));
    }
    if (input.order !== undefined) {
      url.searchParams.set("order", String(input.order));
    }
    if (input.searchTerms !== undefined) {
      url.searchParams.set("searchTerms", String(input.searchTerms));
    }
    url.searchParams.set("maxResults", String(input.maxResults ?? 20));
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwForYouTube(res, "listComments");
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
