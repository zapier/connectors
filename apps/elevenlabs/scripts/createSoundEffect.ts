#!/usr/bin/env node
// Binary audio endpoint: returns raw audio bytes with generation metadata
// in response headers.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  generatedAudioFromResponse,
  GeneratedAudioSchema,
} from "../lib/audioOutput.ts";
import {
  SOUND_EFFECT_OUTPUT_FORMATS,
  throwElevenLabsError,
} from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    text: z
      .string()
      .describe(
        'Description of the sound to generate, e.g. "rain on a tin roof, distant thunder".',
      ),
    duration_seconds: z
      .number()
      .gte(0.5)
      .lte(30)
      .describe(
        "Length of the sound in seconds, 0.5 to 30. Omit to let the model pick an optimal duration from the prompt.",
      )
      .optional(),
    prompt_influence: z
      .number()
      .gte(0)
      .lte(1)
      .describe(
        "0 to 1. Higher follows the prompt more literally; lower is more creative. Default 0.3.",
      )
      .optional(),
    loop: z
      .boolean()
      .describe("Whether to create a seamlessly looping sound. Default false.")
      .optional(),
    output_format: z
      .enum(SOUND_EFFECT_OUTPUT_FORMATS)
      .default("mp3_44100_128")
      .describe(
        "Audio format as codec_samplerate_bitrate, e.g. mp3_44100_128 (default). Same tier gates as textToSpeech; this endpoint does not offer wav_44100.",
      ),
    return_base64: z
      .boolean()
      .default(false)
      .describe(
        "If true, return the audio inline as audio_base64 instead of writing a file and returning audio_path. Use for consumers without filesystem access (e.g. remote MCP); note the base64 payload is large. Default false (file path).",
      ),
  })
  .strict();
const outputSchema = GeneratedAudioSchema;

const definition = defineTool({
  name: "createSoundEffect",
  title: "Create Sound Effect",
  description:
    'Generate a sound effect from a text description, e.g. "heavy wooden door creaking open". For spoken words use textToSpeech instead.',
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "elevenlabs",
  run: async (input, ctx) => {
    const url = new URL("https://api.elevenlabs.io/v1/sound-generation");
    url.searchParams.set("output_format", input.output_format);
    const body: Record<string, unknown> = { text: input.text };
    if (input.duration_seconds !== undefined)
      body["duration_seconds"] = input.duration_seconds;
    if (input.prompt_influence !== undefined)
      body["prompt_influence"] = input.prompt_influence;
    if (input.loop !== undefined) body["loop"] = input.loop;
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok)
      await throwElevenLabsError(res, "ElevenLabs createSoundEffect");
    return generatedAudioFromResponse(res, {
      outputFormat: input.output_format,
      returnBase64: input.return_base64,
      filePrefix: "sound-effect",
    });
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
