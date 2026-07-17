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
    type: z
      .enum(["avatar", "image"])
      .describe(
        "avatar: a talking avatar look. image: animate a still image. Selects which visual source is required.",
      ),
    avatar_id: z
      .string()
      .describe(
        "Avatar look id from listAvatarLooks (a look id is the avatar_id). Required when type=avatar. Fields `avatar_id`, `image_url`, and `image_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    image_url: z
      .string()
      .describe(
        "Public HTTPS URL of the source image. Use when type=image. Fields `avatar_id`, `image_url`, and `image_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    image_asset_id: z
      .string()
      .describe(
        "HeyGen asset id of the source image (if you already have a HeyGen asset id). Use when type=image. Fields `avatar_id`, `image_url`, and `image_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    script: z
      .string()
      .describe(
        "Text the avatar speaks (max 5000 chars). Provide with voice_id, or use audio instead. Fields `script`, `audio_url`, and `audio_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    voice_id: z
      .string()
      .describe(
        "Voice for the script, from listVoices. Required when script is set and no audio is given.",
      )
      .optional(),
    audio_url: z
      .string()
      .describe(
        "Public HTTPS URL of pre-recorded audio to drive the avatar instead of TTS. Fields `script`, `audio_url`, and `audio_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    audio_asset_id: z
      .string()
      .describe(
        "HeyGen asset id of pre-recorded audio (if you already have a HeyGen asset id). Fields `script`, `audio_url`, and `audio_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    voice_settings: z
      .object({
        speed: z
          .number()
          .describe("Playback speed multiplier, 0.5-1.5.")
          .optional(),
        pitch: z
          .number()
          .describe("Pitch adjustment in semitones, -50 to 50.")
          .optional(),
        volume: z
          .number()
          .describe("Voice volume, 0.0 (silent) to 1.0 (full).")
          .optional(),
        locale: z
          .string()
          .describe("Accent/locale for multilingual voices.")
          .optional(),
      })
      .strict()
      .describe("Optional voice tuning for generated speech in a video.")
      .optional(),
    title: z
      .string()
      .describe("Organizational title (not shown in the video).")
      .optional(),
    resolution: z
      .enum(["720p", "1080p", "4k"])
      .describe(
        "Output resolution. Defaults to 1080p; the free plan caps at 720p.",
      )
      .optional(),
    aspect_ratio: z
      .enum(["16:9", "9:16", "4:5", "5:4", "1:1", "auto"])
      .describe("Output aspect ratio.")
      .optional(),
    fit: z
      .enum(["contain", "cover"])
      .describe("How the avatar/image fits the frame.")
      .optional(),
    output_format: z
      .enum(["mp4", "webm"])
      .describe(
        "mp4 (default) or webm (transparent background; needs a matting-capable avatar).",
      )
      .optional(),
    background: z
      .object({
        type: z
          .enum(["color", "image"])
          .describe("color uses a hex value; image uses url or asset_id.")
          .optional(),
        value: z
          .string()
          .describe("Hex color (e.g. #FAFAFA) when type=color.")
          .optional(),
        url: z
          .string()
          .describe("Public HTTPS image URL when type=image.")
          .optional(),
        asset_id: z
          .string()
          .describe(
            "HeyGen asset id when type=image (if you already have a HeyGen asset id).",
          )
          .optional(),
      })
      .strict()
      .describe("Video background — a solid color or an image.")
      .optional(),
    caption: z
      .object({
        file_format: z
          .literal("srt")
          .describe("Caption file format.")
          .optional(),
        style: z.literal("default").describe("Caption style.").optional(),
      })
      .strict()
      .describe("Burn-in caption settings.")
      .optional(),
    remove_background: z
      .boolean()
      .describe("Remove the avatar's background (transparent output).")
      .optional(),
    motion_prompt: z
      .string()
      .describe("Natural-language guidance for avatar motion.")
      .optional(),
    expressiveness: z
      .enum(["high", "medium", "low"])
      .describe("How expressive the avatar's delivery is.")
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
      [input.avatar_id, input.image_url, input.image_asset_id].filter(
        (v) => v !== undefined,
      ).length <= 1,
    {
      message:
        "Fields `avatar_id`, `image_url`, and `image_asset_id` are mutually exclusive — pass at most one.",
      path: ["avatar_id"],
    },
  )
  .refine(
    (input) =>
      [input.script, input.audio_url, input.audio_asset_id].filter(
        (v) => v !== undefined,
      ).length <= 1,
    {
      message:
        "Fields `script`, `audio_url`, and `audio_asset_id` are mutually exclusive — pass at most one.",
      path: ["script"],
    },
  )
  .meta({
    allOf: [
      { not: { required: ["avatar_id", "image_url"] } },
      { not: { required: ["avatar_id", "image_asset_id"] } },
      { not: { required: ["image_url", "image_asset_id"] } },
      { not: { required: ["script", "audio_url"] } },
      { not: { required: ["script", "audio_asset_id"] } },
      { not: { required: ["audio_url", "audio_asset_id"] } },
    ],
  });
const outputSchema = z.object({
  video_id: z.string().describe("Id of the created video; poll with getVideo."),
  status: z
    .string()
    .describe(
      "Initial status (e.g. waiting), before processing/completed/failed.",
    ),
  output_format: z.enum(["mp4", "webm"]).nullable().optional(),
});

const definition = defineTool({
  name: "createVideo",
  title: "Create Video",
  description:
    "Generate an AI video of an avatar (type=avatar) or an animated still image (type=image) speaking a script or driven by audio. Returns a video_id to poll with getVideo.",
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
    const url = `https://api.heygen.com/v3/videos`;
    const body: Record<string, unknown> = {};
    if (input.type !== undefined) body["type"] = input.type;
    if (input.avatar_id !== undefined) body["avatar_id"] = input.avatar_id;
    if (input.image_url !== undefined) body["image_url"] = input.image_url;
    if (input.image_asset_id !== undefined)
      body["image_asset_id"] = input.image_asset_id;
    if (input.script !== undefined) body["script"] = input.script;
    if (input.voice_id !== undefined) body["voice_id"] = input.voice_id;
    if (input.audio_url !== undefined) body["audio_url"] = input.audio_url;
    if (input.audio_asset_id !== undefined)
      body["audio_asset_id"] = input.audio_asset_id;
    if (input.voice_settings !== undefined)
      body["voice_settings"] = input.voice_settings;
    if (input.title !== undefined) body["title"] = input.title;
    if (input.resolution !== undefined) body["resolution"] = input.resolution;
    if (input.aspect_ratio !== undefined)
      body["aspect_ratio"] = input.aspect_ratio;
    if (input.fit !== undefined) body["fit"] = input.fit;
    if (input.output_format !== undefined)
      body["output_format"] = input.output_format;
    if (input.background !== undefined) body["background"] = input.background;
    if (input.caption !== undefined) body["caption"] = input.caption;
    if (input.remove_background !== undefined)
      body["remove_background"] = input.remove_background;
    if (input.motion_prompt !== undefined)
      body["motion_prompt"] = input.motion_prompt;
    if (input.expressiveness !== undefined)
      body["expressiveness"] = input.expressiveness;
    if (input.callback_url !== undefined)
      body["callback_url"] = input.callback_url;
    if (input.callback_id !== undefined)
      body["callback_id"] = input.callback_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Heygen createVideo");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
