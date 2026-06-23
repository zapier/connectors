#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { CommentSchema, throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    snippet: z
      .object({
        parentId: z
          .string()
          .describe("The comment thread id to reply to (from listComments)."),
        textOriginal: z.string().describe("The reply text to post."),
      })
      .strict(),
    part: z
      .string()
      .describe("Resource parts being written. Leave as the default.")
      .default("snippet"),
  })
  .strict();
const outputSchema = CommentSchema;

const definition = defineTool({
  name: "replyToComment",
  title: "Reply To Comment",
  description:
    "Reply to an existing top-level comment thread. The parentId is the comment thread id from listComments. Requires the youtube.force-ssl scope.",
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
    const url = new URL(`https://www.googleapis.com/youtube/v3/comments`);
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
    await throwForYouTube(res, "replyToComment");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
