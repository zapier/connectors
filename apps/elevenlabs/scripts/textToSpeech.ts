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
  AUDIO_OUTPUT_FORMATS,
  throwElevenLabsError,
  VoiceSettingsInputSchema,
} from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    voice_id: z
      .string()
      .describe(
        "Voice ID, e.g. JBFqnCBsd6RMkjVDRZzb. Resolve available IDs with listVoices; a voice found via searchVoiceLibrary must be added to the account with addSharedVoice before its ID works here.",
      ),
    text: z
      .string()
      .describe(
        "The text to convert to speech. Check maximum_text_length_per_request in listModels for the selected model's current limit.",
      ),
    model_id: z
      .string()
      .default("eleven_multilingual_v2")
      .describe(
        "Model to use; must have can_do_text_to_speech true in listModels. Defaults to eleven_multilingual_v2.",
      ),
    language_code: z
      .string()
      .describe(
        'ISO 639-1 code to enforce, e.g. "en". Unsupported language enforcement is ignored; multilingual_v2 does not support this parameter.',
      )
      .optional(),
    voice_settings: VoiceSettingsInputSchema.optional(),
    seed: z
      .number()
      .int()
      .gte(0)
      .lte(4294967295)
      .describe(
        "Best-effort deterministic sampling; same seed + inputs approximates the same audio. 0 to 4294967295.",
      )
      .optional(),
    output_format: z
      .enum(AUDIO_OUTPUT_FORMATS)
      .default("mp3_44100_128")
      .describe(
        "Audio format as codec_samplerate_bitrate. mp3_44100_192 needs Creator tier or above; pcm_44100/wav_44100 need Pro or above. Default mp3_44100_128.",
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
  name: "textToSpeech",
  title: "Text to Speech",
  description:
    "Convert text to spoken audio in a chosen voice. Resolve voice_id via listVoices (library voices must first be added with addSharedVoice).",
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
    const url = new URL(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(input.voice_id)}`,
    );
    url.searchParams.set("output_format", input.output_format);
    const body: Record<string, unknown> = {
      text: input.text,
      model_id: input.model_id,
    };
    if (input.language_code !== undefined)
      body["language_code"] = input.language_code;
    if (input.voice_settings !== undefined)
      body["voice_settings"] = input.voice_settings;
    if (input.seed !== undefined) body["seed"] = input.seed;
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs textToSpeech");
    return generatedAudioFromResponse(res, {
      outputFormat: input.output_format,
      returnBase64: input.return_base64,
      filePrefix: "text-to-speech",
    });
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
