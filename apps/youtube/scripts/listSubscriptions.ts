#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  NextPageToken,
  SubscriptionSchema,
  throwForYouTube,
} from "../lib/youtube.ts";

const inputSchema = z
  .object({
    part: z
      .string()
      .describe("Resource parts to return. Leave as the default.")
      .default("snippet,contentDetails"),
    mine: z
      .boolean()
      .describe("List the authenticated user's subscriptions. The default.")
      .default(true),
    forChannelId: z
      .string()
      .describe(
        "Restrict to a subscription to this specific channel id — returns one item if subscribed, none otherwise. Use to check subscription state.",
      )
      .optional(),
    order: z
      .enum(["alphabetical", "relevance", "unread"])
      .describe("Sort order.")
      .default("relevance"),
    maxResults: z
      .number()
      .int()
      .gte(1)
      .lte(50)
      .describe(
        "Max subscriptions per page (1-50). Defaults to 20 when omitted; pass a value when you need a specific number of results.",
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
  items: z.array(SubscriptionSchema).describe("The subscriptions."),
  next_page_token: NextPageToken,
});

const definition = defineTool({
  name: "listSubscriptions",
  title: "List Subscriptions",
  description:
    "List the channels the authenticated user is subscribed to (default), or check whether the user subscribes to a specific channel via forChannelId.",
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
    const url = new URL(`https://www.googleapis.com/youtube/v3/subscriptions`);
    if (input.part !== undefined) {
      url.searchParams.set("part", String(input.part));
    }
    if (input.mine !== undefined) {
      url.searchParams.set("mine", String(input.mine));
    }
    if (input.forChannelId !== undefined) {
      url.searchParams.set("forChannelId", String(input.forChannelId));
    }
    if (input.order !== undefined) {
      url.searchParams.set("order", String(input.order));
    }
    url.searchParams.set("maxResults", String(input.maxResults ?? 20));
    if (input.pageToken !== undefined) {
      url.searchParams.set("pageToken", String(input.pageToken));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwForYouTube(res, "listSubscriptions");
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
