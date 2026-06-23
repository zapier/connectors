#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SuccessResultSchema, throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({
    id: z.string().describe("The id of the video to rate."),
    rating: z
      .enum(["like", "dislike", "none"])
      .describe(
        "like or dislike to set the rating; none to remove an existing rating.",
      ),
  })
  .strict();

const outputSchema = SuccessResultSchema;

const definition = defineTool({
  name: "rateVideo",
  title: "Rate Video",
  description:
    "Like, dislike, or clear the authenticated user's rating on a video (the thumbs up/down action). Use rating=none to remove an existing rating. The API returns no body; the connector synthesizes a success flag.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    // Setting the same rating twice leaves the same state.
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/videos/rate`);
    url.searchParams.set("id", input.id);
    url.searchParams.set("rating", input.rating);

    // videos.rate returns 204 No Content on success — synthesize the success flag.
    const res = await ctx.fetch(url.toString(), { method: "POST" });
    await throwForYouTube(res, "rateVideo");
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
