#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { SuccessResultSchema, throwForYouTube } from "../lib/youtube.ts";

const inputSchema = z
  .object({ id: z.string().describe("The id of the video to delete.") })
  .strict();
const outputSchema = SuccessResultSchema;

const definition = defineTool({
  name: "deleteVideo",
  title: "Delete Video",
  description:
    "Permanently delete a video from the authenticated user's channel. Irreversible. The caller must own the video.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "youtube",
  run: async (input, ctx) => {
    const url = new URL(`https://www.googleapis.com/youtube/v3/videos`);
    if (input.id !== undefined) {
      url.searchParams.set("id", String(input.id));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "DELETE",
    });
    await throwForYouTube(res, "deleteVideo");
    return { success: true as const };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
