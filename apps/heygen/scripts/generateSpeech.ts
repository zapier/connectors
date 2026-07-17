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
    text: z
      .string()
      .describe("Text (or SSML) to synthesize, 1-5000 characters."),
    voice_id: z
      .string()
      .describe(
        "A starfish-compatible voice from listVoices (filter engine=starfish).",
      ),
    input_type: z
      .enum(["text", "ssml"])
      .describe(
        'text (default) or ssml (supports <break time="0.5s"/>; check the voice\'s support_pause).',
      )
      .optional(),
    speed: z
      .number()
      .describe("Playback speed multiplier, 0.5-2.0.")
      .optional(),
    language: z
      .string()
      .describe("Language hint for multilingual voices.")
      .optional(),
    locale: z
      .string()
      .describe("Accent/locale hint for multilingual voices.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  audio_url: z
    .string()
    .describe("URL of the generated audio (presigned, expires)."),
  duration: z.number().describe("Audio duration in seconds."),
  request_id: z.union([z.string(), z.null()]).optional(),
  word_timestamps: z
    .union([z.array(z.record(z.string(), z.any())), z.null()])
    .optional(),
});

const definition = defineTool({
  name: "generateSpeech",
  title: "Generate Speech",
  description:
    "Synthesize speech audio from text using a starfish-compatible HeyGen voice (text-to-speech). Returns an audio URL and duration.",
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
    const url = `https://api.heygen.com/v3/voices/speech`;
    const body: Record<string, unknown> = {};
    if (input.text !== undefined) body["text"] = input.text;
    if (input.voice_id !== undefined) body["voice_id"] = input.voice_id;
    if (input.input_type !== undefined) body["input_type"] = input.input_type;
    if (input.speed !== undefined) body["speed"] = input.speed;
    if (input.language !== undefined) body["language"] = input.language;
    if (input.locale !== undefined) body["locale"] = input.locale;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Heygen generateSpeech");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
