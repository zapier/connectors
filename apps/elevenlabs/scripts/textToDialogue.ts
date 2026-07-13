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
} from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    inputs: z
      .array(
        z
          .object({
            text: z
              .string()
              .describe('The line to speak, e.g. "Hello, how are you?".'),
            voice_id: z
              .string()
              .describe("Voice that speaks this line, from listVoices."),
          })
          .strict(),
      )
      .min(1)
      .describe(
        "The dialogue lines in order. Up to 10 unique voice_ids; keep the total character count across all lines at or below 2000 per request (longer requests can fail validation or terminate early).",
      ),
    model_id: z
      .string()
      .default("eleven_v3")
      .describe(
        "Model to use; defaults to eleven_v3 (the model this endpoint is built for — your account needs access to it).",
      ),
    language_code: z
      .string()
      .describe(
        'ISO 639-1 code to enforce, e.g. "en". Ignored by models that don\'t support enforcement.',
      )
      .optional(),
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
        "Audio format as codec_samplerate_bitrate, e.g. mp3_44100_128 (default). Same values and tier gates as textToSpeech.",
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
  name: "textToDialogue",
  title: "Text to Dialogue",
  description:
    "Generate a multi-speaker audio conversation from a list of text lines, each spoken by its own voice — e.g. a podcast exchange or scripted dialogue. Uses the eleven_v3 model (verify account access via listModels). Resolve voice_ids via listVoices.",
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
    const url = new URL("https://api.elevenlabs.io/v1/text-to-dialogue");
    url.searchParams.set("output_format", input.output_format);
    const body: Record<string, unknown> = {
      inputs: input.inputs,
      model_id: input.model_id,
    };
    if (input.language_code !== undefined)
      body["language_code"] = input.language_code;
    if (input.seed !== undefined) body["seed"] = input.seed;
    const res = await ctx.fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs textToDialogue");
    return generatedAudioFromResponse(res, {
      outputFormat: input.output_format,
      returnBase64: input.return_base64,
      filePrefix: "dialogue",
    });
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
