#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { CommentThreadSchema, throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    snippet: z
      .object({
        videoId: z.string().describe("The video to comment on."),
        topLevelComment: z
          .object({
            snippet: z
              .object({
                textOriginal: z.string().describe("The comment text to post."),
              })
              .strict(),
          })
          .strict(),
      })
      .strict(),
    part: z
      .string()
      .describe("Resource parts being written. Leave as the default.")
      .default("snippet"),
  })
  .strict();
const outputSchema = CommentThreadSchema;

const definition = defineTool({
  name: "postComment",
  title: "Post Comment",
  description:
    "Post a new top-level comment on a video. For a reply to an existing comment, use replyToComment instead. Requires the youtube.force-ssl scope.",
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
    const url = new URL(`https://www.googleapis.com/youtube/v3/commentThreads`);
    if (input.part !== undefined) {
      url.searchParams.set("part", String(input.part));
    }
    const body: Record<string, unknown> = {};
    if (input.snippet !== undefined) body["snippet"] = input.snippet;
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwForYouTube(res, "postComment");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
