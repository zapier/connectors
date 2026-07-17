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
        "Public HTTPS URL of the source video (or provide video_asset_id). Fields `video_url` and `video_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    video_asset_id: z
      .string()
      .describe(
        "HeyGen asset id of the source video (if you already have a HeyGen asset id). Fields `video_url` and `video_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    output_languages: z
      .array(z.string())
      .describe(
        "Target languages from listTranslationLanguages. One translation id is returned per language.",
      ),
    title: z.string().describe("Organizational title.").optional(),
    mode: z
      .enum(["speed", "precision"])
      .describe("speed or precision — trades latency for fidelity.")
      .optional(),
    input_language: z.string().describe("Source language hint.").optional(),
    translate_audio_only: z
      .boolean()
      .describe("Translate audio only, keep the original video.")
      .optional(),
    enable_caption: z
      .boolean()
      .describe("Generate captions for the output.")
      .optional(),
    speaker_num: z
      .number()
      .int()
      .describe("Hint for multi-speaker videos.")
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
  .meta({ allOf: [{ not: { required: ["video_url", "video_asset_id"] } }] });
const outputSchema = z.object({
  video_translation_ids: z
    .array(z.string())
    .describe(
      "One id per requested output language; poll each with getVideoTranslation.",
    ),
});

const definition = defineTool({
  name: "translateVideo",
  title: "Translate Video",
  description:
    "Translate an existing video into one or more languages with voice cloning and lip-sync. Returns one translation id per target language; poll each with getVideoTranslation.",
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
    const url = `https://api.heygen.com/v3/video-translations`;
    const body: Record<string, unknown> = {};
    if (input.video_url !== undefined) body["video_url"] = input.video_url;
    if (input.video_asset_id !== undefined)
      body["video_asset_id"] = input.video_asset_id;
    if (input.output_languages !== undefined)
      body["output_languages"] = input.output_languages;
    if (input.title !== undefined) body["title"] = input.title;
    if (input.mode !== undefined) body["mode"] = input.mode;
    if (input.input_language !== undefined)
      body["input_language"] = input.input_language;
    if (input.translate_audio_only !== undefined)
      body["translate_audio_only"] = input.translate_audio_only;
    if (input.enable_caption !== undefined)
      body["enable_caption"] = input.enable_caption;
    if (input.speaker_num !== undefined)
      body["speaker_num"] = input.speaker_num;
    if (input.callback_url !== undefined)
      body["callback_url"] = input.callback_url;
    if (input.callback_id !== undefined)
      body["callback_id"] = input.callback_id;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Heygen translateVideo");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
