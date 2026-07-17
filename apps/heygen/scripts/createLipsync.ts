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
    video_url: z
      .string()
      .describe(
        "Public HTTPS URL of the source video — provide this or video_asset_id (a video source is required). Fields `video_url` and `video_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    video_asset_id: z
      .string()
      .describe(
        "HeyGen asset id of the source video. Fields `video_url` and `video_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    audio_url: z
      .string()
      .describe(
        "Public HTTPS URL of the replacement audio — provide this or audio_asset_id (an audio source is required). Fields `audio_url` and `audio_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    audio_asset_id: z
      .string()
      .describe(
        "HeyGen asset id of the replacement audio. Fields `audio_url` and `audio_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    title: z.string().describe("Organizational title.").optional(),
    mode: z
      .enum(["speed", "precision"])
      .describe("speed or precision — trades latency for fidelity.")
      .optional(),
    enable_caption: z
      .boolean()
      .describe("Generate captions for the output.")
      .optional(),
    start_time: z
      .number()
      .describe("Start time in seconds (lip-sync only a segment).")
      .optional(),
    end_time: z
      .number()
      .describe("End time in seconds (lip-sync only a segment).")
      .optional(),
    callback_url: z
      .string()
      .describe(
        "Optional URL HeyGen POSTs to on completion (for callers running their own receiver).",
      )
      .optional(),
    callback_id: z
      .string()
      .describe(
        "Optional client reference echoed back in status responses and callbacks.",
      )
      .optional(),
  })
  .strict()
  .refine(
    (input) =>
      [input.video_url, input.video_asset_id].filter((v) => v !== undefined)
        .length <= 1,
    {
      message:
        "Fields `video_url` and `video_asset_id` are mutually exclusive — pass at most one.",
      path: ["video_url"],
    },
  )
  .refine(
    (input) =>
      [input.audio_url, input.audio_asset_id].filter((v) => v !== undefined)
        .length <= 1,
    {
      message:
        "Fields `audio_url` and `audio_asset_id` are mutually exclusive — pass at most one.",
      path: ["audio_url"],
    },
  )
  .refine(
    (input) =>
      input.video_url !== undefined || input.video_asset_id !== undefined,
    {
      message:
        "A video source is required — provide video_url or video_asset_id.",
      path: ["video_url"],
    },
  )
  .refine(
    (input) =>
      input.audio_url !== undefined || input.audio_asset_id !== undefined,
    {
      message:
        "An audio source is required — provide audio_url or audio_asset_id.",
      path: ["audio_url"],
    },
  )
  .meta({
    allOf: [
      { not: { required: ["video_url", "video_asset_id"] } },
      { not: { required: ["audio_url", "audio_asset_id"] } },
      {
        anyOf: [{ required: ["video_url"] }, { required: ["video_asset_id"] }],
      },
      {
        anyOf: [{ required: ["audio_url"] }, { required: ["audio_asset_id"] }],
      },
    ],
  });
const outputSchema = z.object({
  lipsync_id: z.string().describe("Lipsync id; poll with getLipsync."),
});

const definition = defineTool({
  name: "createLipsync",
  title: "Create Lipsync",
  description:
    "Replace the audio on an existing video and re-animate the speaker's lips to match. Returns a lipsync_id to poll with getLipsync.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "heygen",
  run: async (input, ctx) => {
    const url = `https://api.heygen.com/v3/lipsyncs`;
    const body: Record<string, unknown> = {};
    if (input.video_url !== undefined) body["video_url"] = input.video_url;
    if (input.video_asset_id !== undefined)
      body["video_asset_id"] = input.video_asset_id;
    if (input.audio_url !== undefined) body["audio_url"] = input.audio_url;
    if (input.audio_asset_id !== undefined)
      body["audio_asset_id"] = input.audio_asset_id;
    if (input.title !== undefined) body["title"] = input.title;
    if (input.mode !== undefined) body["mode"] = input.mode;
    if (input.enable_caption !== undefined)
      body["enable_caption"] = input.enable_caption;
    if (input.start_time !== undefined) body["start_time"] = input.start_time;
    if (input.end_time !== undefined) body["end_time"] = input.end_time;
    if (input.callback_url !== undefined)
      body["callback_url"] = input.callback_url;
    if (input.callback_id !== undefined)
      body["callback_id"] = input.callback_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Heygen createLipsync");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
