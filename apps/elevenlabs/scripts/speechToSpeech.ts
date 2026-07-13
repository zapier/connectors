#!/usr/bin/env node
// Binary audio endpoint: takes multipart audio bytes on the wire and returns
// raw audio bytes. The agent provides the source as a URL or local path; the
// form assembly and audio disposition live in lib/.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { loadAudioSource } from "../lib/audioInput.ts";
import {
  generatedAudioFromResponse,
  GeneratedAudioSchema,
} from "../lib/audioOutput.ts";
import {
  AUDIO_OUTPUT_FORMATS,
  postMultipart,
  throwElevenLabsError,
  VoiceSettingsInputSchema,
} from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    voice_id: z
      .string()
      .describe(
        "Voice to convert into, e.g. JBFqnCBsd6RMkjVDRZzb. Resolve available IDs with listVoices; a voice found via searchVoiceLibrary must be added to the account with addSharedVoice before its ID works here.",
      ),
    audio_url: z
      .string()
      .describe(
        "HTTPS URL of the source audio whose speech will be re-voiced. Provide this or audio_path, not both.",
      )
      .optional(),
    audio_path: z
      .string()
      .describe(
        "Local filesystem path of the source audio — e.g. the audio_path returned by textToSpeech. Provide this or audio_url, not both.",
      )
      .optional(),
    model_id: z
      .string()
      .default("eleven_multilingual_sts_v2")
      .describe(
        "Model to use; must have can_do_voice_conversion true in listModels. Defaults to eleven_multilingual_sts_v2.",
      ),
    output_format: z
      .enum(AUDIO_OUTPUT_FORMATS)
      .default("mp3_44100_128")
      .describe(
        "Audio format as codec_samplerate_bitrate, e.g. mp3_44100_128 (default). Same values and tier gates as textToSpeech.",
      ),
    voice_settings: VoiceSettingsInputSchema.optional(),
    remove_background_noise: z
      .boolean()
      .default(false)
      .describe(
        "Strip background noise from the source audio with the audio-isolation model before converting. Default false.",
      ),
    seed: z
      .number()
      .int()
      .gte(0)
      .lte(4294967295)
      .describe(
        "Best-effort deterministic sampling; same seed + inputs approximates the same audio. 0 to 4294967295.",
      )
      .optional(),
    return_base64: z
      .boolean()
      .default(false)
      .describe(
        "If true, return the audio inline as audio_base64 instead of writing a file and returning audio_path. Use for consumers without filesystem access (e.g. remote MCP); note the base64 payload is large. Default false (file path).",
      ),
  })
  .strict()
  .superRefine((value, ctx) => {
    const provided = [value.audio_url, value.audio_path].filter(
      (v) => v !== undefined,
    ).length;
    if (provided !== 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide exactly one of audio_url (HTTPS URL) or audio_path (local file).",
      });
    }
  });
const outputSchema = GeneratedAudioSchema;

const definition = defineTool({
  name: "speechToSpeech",
  title: "Speech to Speech",
  description:
    "Re-voice existing speech in a different voice while retaining control over emotion, timing, and delivery. Provide one HTTPS URL or local file path; resolve voice_id via listVoices (library voices must first be added with addSharedVoice). Requires a direct connection (env:) — audio uploads aren't supported over a Zapier-managed connection yet.",
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
    const source = await loadAudioSource(input, "ElevenLabs speechToSpeech");
    const form = new FormData();
    form.append("audio", source.blob, source.filename);
    form.append("model_id", input.model_id);
    if (input.voice_settings !== undefined) {
      // The wire expects voice_settings as a JSON string inside the form.
      form.append("voice_settings", JSON.stringify(input.voice_settings));
    }
    form.append(
      "remove_background_noise",
      String(input.remove_background_noise),
    );
    if (input.seed !== undefined) form.append("seed", String(input.seed));
    const url = new URL(
      `https://api.elevenlabs.io/v1/speech-to-speech/${encodeURIComponent(input.voice_id)}`,
    );
    url.searchParams.set("output_format", input.output_format);
    // No Content-Type header: the runtime sets multipart/form-data with the boundary.
    const res = await postMultipart(
      ctx,
      url.toString(),
      form,
      "ElevenLabs speechToSpeech",
    );
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs speechToSpeech");
    return generatedAudioFromResponse(res, {
      outputFormat: input.output_format,
      returnBase64: input.return_base64,
      filePrefix: "speech-to-speech",
    });
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
