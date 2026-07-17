#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    video_id: z
      .string()
      .describe(
        "Video id from createVideo, createCinematicVideo, or listVideos.",
      ),
  })
  .strict();
const outputSchema = z.object({
  id: z.string().describe("Video id."),
  title: z.union([z.string(), z.null()]).optional(),
  status: z
    .string()
    .describe(
      "pending, processing, completed, or failed (waiting before processing). Result URLs appear only when completed.",
    ),
  created_at: z
    .union([
      z.number().int().describe("Unix timestamp (seconds)."),
      z.null().describe("Unix timestamp (seconds)."),
    ])
    .describe("Unix timestamp (seconds).")
    .optional(),
  completed_at: z.union([z.number().int(), z.null()]).optional(),
  duration: z
    .union([
      z.number().describe("Duration in seconds."),
      z.null().describe("Duration in seconds."),
    ])
    .describe("Duration in seconds.")
    .optional(),
  video_url: z
    .union([
      z
        .string()
        .describe(
          "Presigned download URL (expires; download promptly). Present when completed.",
        ),
      z
        .null()
        .describe(
          "Presigned download URL (expires; download promptly). Present when completed.",
        ),
    ])
    .describe(
      "Presigned download URL (expires; download promptly). Present when completed.",
    )
    .optional(),
  thumbnail_url: z.union([z.string(), z.null()]).optional(),
  gif_url: z.union([z.string(), z.null()]).optional(),
  captioned_video_url: z.union([z.string(), z.null()]).optional(),
  subtitle_url: z.union([z.string(), z.null()]).optional(),
  video_page_url: z
    .union([
      z.string().describe("Public shareable HeyGen page for the video."),
      z.null().describe("Public shareable HeyGen page for the video."),
    ])
    .describe("Public shareable HeyGen page for the video.")
    .optional(),
  output_language: z.union([z.string(), z.null()]).optional(),
  failure_code: z
    .union([
      z.string().describe("Present when status=failed."),
      z.null().describe("Present when status=failed."),
    ])
    .describe("Present when status=failed.")
    .optional(),
  failure_message: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "getVideo",
  title: "Get Video",
  description:
    "Poll a video's status and, once completed, get its result URLs (video, thumbnail, GIF, captions, share page). Call until status is completed or failed.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "heygen",
  run: async (input, ctx) => {
    const url = `https://api.heygen.com/v3/videos/${encodeURIComponent(input.video_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen getVideo");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
