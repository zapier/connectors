#!/usr/bin/env node
// Authored by the implementation agent: codegen scaffolds a flat body, but
// Runway's speech_to_speech endpoint takes nested, discriminated `media`
// ({ type: "audio"|"video", uri }) and `voice` ({ type: "runway-preset",
// presetId }) objects — so run() assembles both from the flat inputs and
// injects the constant type discriminators.
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
    mediaUri: z
      .string()
      .describe(
        "HTTPS URL or data URI of the audio or video clip whose voice should be replaced.",
      ),
    mediaType: z
      .enum(["audio", "video"])
      .describe("Whether mediaUri points to an audio or a video clip.")
      .default("audio"),
    voicePresetId: z
      .string()
      .describe(
        "The Runway preset voice to convert the speech to. Common values: `Maya`, `Arjun`, `Serene`, `Bernard`, `Billy`, ... (49 total).",
      ),
    model: z
      .string()
      .describe(
        "Speech-to-speech model to use. Required — no default; the caller chooses. Recommended: eleven_multilingual_sts_v2. New Runway models work here without a connector update.",
      ),
    removeBackgroundNoise: z
      .boolean()
      .describe("Whether to remove background noise from the generated speech.")
      .optional(),
    wait: waitInputField,
  })
  .strict();

const definition = defineTool({
  name: "convertVoice",
  title: "Convert Voice",
  description:
    "Replace the voice in an audio or video clip with a target preset voice while preserving the dialogue (speech-to-speech). Asynchronous: returns a task id (poll getTask), or set wait: true to block until it finishes.",
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
    const body: Record<string, unknown> = {
      media: { type: input.mediaType, uri: input.mediaUri },
      voice: { type: "runway-preset", presetId: input.voicePresetId },
      model: input.model,
    };
    if (input.removeBackgroundNoise !== undefined)
      body.removeBackgroundNoise = input.removeBackgroundNoise;
    return submitGeneration(
      ctx.fetch,
      "/speech_to_speech",
      body,
      input.wait,
      "Runway convertVoice",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
