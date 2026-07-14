#!/usr/bin/env node
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
      .max(3000)
      .describe(
        "A text description of the sound effect to generate. Up to 3000 characters.",
      ),
    model: z
      .string()
      .describe(
        "Sound-effect model. Required — no default; the caller chooses. Recommended: eleven_text_to_sound_v2, seed_audio. New Runway models work here without a connector update.",
      ),
    duration: z
      .number()
      .gte(0.5)
      .lte(30)
      .describe(
        "Sound-effect length in seconds, 0.5-30 (eleven_text_to_sound_v2). If omitted, chosen automatically.",
      )
      .optional(),
    loop: z
      .boolean()
      .describe(
        "Whether the sound effect should loop seamlessly (eleven_text_to_sound_v2).",
      )
      .optional(),
    referenceAudios: z
      .array(z.string())
      .max(3)
      .describe(
        "Up to three reference audio clips (HTTPS URLs or data URIs) for seed_audio; refer to them in promptText as @Audio1, @Audio2, @Audio3.",
      )
      .optional(),
    speechRate: z
      .number()
      .int()
      .gte(-50)
      .lte(100)
      .describe(
        "Relative speed; negative is slower, positive is faster, 0 is normal (seed_audio).",
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
      .describe("Pitch shift in semitones (seed_audio).")
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
  .strict();

const definition = defineTool({
  name: "generateSoundEffect",
  title: "Generate Sound Effect",
  description:
    "Generate a sound effect from a text description. Asynchronous: returns a task id (poll getTask for the finished audio URL), or set wait: true to block until it finishes.",
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
    const { wait, ...rest } = input;
    return submitGeneration(
      ctx.fetch,
      "/sound_effect",
      rest,
      wait,
      "Runway generateSoundEffect",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
