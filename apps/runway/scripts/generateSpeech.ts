#!/usr/bin/env node
// Authored by the implementation agent: codegen scaffolds a flat body, but
// Runway's text_to_speech endpoint takes a nested, discriminated `voice`
// object — { type: "runway-preset", presetId } for preset voices vs
// { type: "reference-audio", audioUri } for cloning — so run() builds the
// nested shape from the two mutually-exclusive flat inputs.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import {
  generationResultSchema,
  submitGeneration,
  waitInputField,
} from "../lib/runway.ts";

const inputSchema = z
  .object({
    promptText: z
      .string()
      .min(1)
      .max(2048)
      .describe("The words to speak. Up to 2048 characters."),
    model: z
      .string()
      .describe(
        "Speech model to use. Required — no default; the caller chooses. Recommended: eleven_multilingual_v2 (preset voices), seed_audio (voice cloning). New Runway models work here without a connector update.",
      ),
    voicePresetId: z
      .string()
      .describe(
        "A Runway preset voice to speak in (required for eleven_multilingual_v2). Provide exactly one of voicePresetId or voiceReferenceAudioUri. Common values: `Maya`, `Arjun`, `Serene`, `Bernard`, `Billy`, ... (49 total).",
      )
      .optional(),
    voiceReferenceAudioUri: z
      .string()
      .describe(
        "HTTPS URL or data URI of an audio clip to clone the voice from (seed_audio). Provide exactly one of voiceReferenceAudioUri or voicePresetId.",
      )
      .optional(),
    speechRate: z
      .number()
      .int()
      .gte(-50)
      .lte(100)
      .describe(
        "Relative speech speed; negative is slower, positive is faster, 0 is normal (seed_audio).",
      )
      .optional(),
    loudnessRate: z
      .number()
      .int()
      .gte(-50)
      .lte(100)
      .describe(
        "Relative loudness; negative is quieter, positive is louder, 0 is normal (seed_audio).",
      )
      .optional(),
    pitchRate: z
      .number()
      .int()
      .gte(-12)
      .lte(12)
      .describe(
        "Pitch shift in semitones; negative lowers, positive raises, 0 is unchanged (seed_audio).",
      )
      .optional(),
    sampleRate: z
      .union([
        z.literal(8000),
        z.literal(16000),
        z.literal(24000),
        z.literal(32000),
        z.literal(44100),
        z.literal(48000),
      ])
      .describe("Output sample rate in Hz (seed_audio).")
      .optional(),
    outputFormat: z
      .enum(["wav", "mp3", "ogg_opus"])
      .describe("Output audio format (seed_audio).")
      .optional(),
    wait: waitInputField,
  })
  .strict()
  .superRefine((val, ctx) => {
    const hasPreset = val.voicePresetId !== undefined;
    const hasReference = val.voiceReferenceAudioUri !== undefined;
    if (hasPreset === hasReference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide exactly one of voicePresetId (preset voice) or voiceReferenceAudioUri (cloned voice).",
        path: ["voicePresetId"],
      });
    }
  });

const definition = defineTool({
  name: "generateSpeech",
  title: "Generate Speech",
  description:
    "Generate spoken audio from text, using a preset voice (voicePresetId) or a cloned reference voice (voiceReferenceAudioUri). Asynchronous: returns a task id (poll getTask for the audio URL), or set wait: true to block until it finishes.",
  inputSchema,
  outputSchema: generationResultSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "runway",
  run: async (input, ctx) => {
    const voice =
      input.voicePresetId !== undefined
        ? { type: "runway-preset", presetId: input.voicePresetId }
        : { type: "reference-audio", audioUri: input.voiceReferenceAudioUri };
    const body: Record<string, unknown> = {
      promptText: input.promptText,
      model: input.model,
      voice,
    };
    if (input.speechRate !== undefined) body.speechRate = input.speechRate;
    if (input.loudnessRate !== undefined)
      body.loudnessRate = input.loudnessRate;
    if (input.pitchRate !== undefined) body.pitchRate = input.pitchRate;
    if (input.sampleRate !== undefined) body.sampleRate = input.sampleRate;
    if (input.outputFormat !== undefined)
      body.outputFormat = input.outputFormat;
    return submitGeneration(
      ctx.fetch,
      "/text_to_speech",
      body,
      input.wait,
      "Runway generateSpeech",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
