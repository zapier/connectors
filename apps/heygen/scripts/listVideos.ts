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
    title: z.string().describe("Filter by title substring.").optional(),
    folder_id: z.string().describe("Only videos in this folder.").optional(),
    limit: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Page size (1-100). Defaults to 10 when omitted; pass a value when you need a specific number of results.",
      )
      .optional(),
    token: z
      .string()
      .describe("Cursor (next_token) from a prior page.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  items: z
    .array(
      z.object({
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
      }),
    )
    .nullable()
    .optional(),
  has_more: z.boolean().nullable().optional(),
  next_token: z.union([z.string(), z.null()]).optional(),
});

const definition = defineTool({
  name: "listVideos",
  title: "List Videos",
  description:
    "List videos in the account (most recent first) with status and result URLs. Filter by folder or title. Translation jobs use listVideoTranslations.",
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
    const url = new URL(`https://api.heygen.com/v3/videos`);
    if (input.title !== undefined) {
      url.searchParams.set("title", String(input.title));
    }
    if (input.folder_id !== undefined) {
      url.searchParams.set("folder_id", String(input.folder_id));
    }
    url.searchParams.set("limit", String(input.limit ?? 10));
    if (input.token !== undefined) {
      url.searchParams.set("token", String(input.token));
    }
    const res = await ctx.fetch(url.toString(), {
      method: "GET",
    });
    await throwIfNotOk(res, "Heygen listVideos");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = {
      items: wirePayload.data,
      has_more: wirePayload.has_more,
      next_token: wirePayload.next_token,
    };
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
