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
    audioUri: z
      .string()
      .describe("HTTPS URL or data URI of the audio clip to dub."),
    targetLang: z
      .string()
      .describe(
        'Target language code to dub into, e.g. "es" (Spanish), "fr" (French), "ja" (Japanese). Common values: `en`, `hi`, `pt`, `zh`, `es`, ... (29 total).',
      ),
    model: z
      .string()
      .describe(
        "Dubbing model. Required — no default; the caller chooses. Recommended: eleven_voice_dubbing. New Runway models work here without a connector update.",
      ),
    disableVoiceCloning: z
      .boolean()
      .describe("Disable voice cloning and use a generic voice instead.")
      .optional(),
    dropBackgroundAudio: z
      .boolean()
      .describe("Remove background audio from the dubbed output.")
      .optional(),
    numSpeakers: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Number of speakers in the audio. If omitted, detected automatically.",
      )
      .optional(),
    wait: waitInputField,
  })
  .strict();

const definition = defineTool({
  name: "dubAudio",
  title: "Dub Audio",
  description:
    "Dub an audio clip into a target language, optionally cloning the original speakers' voices. Asynchronous: returns a task id (poll getTask for the finished audio URL), or set wait: true to block until it finishes.",
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
      "/voice_dubbing",
      rest,
      wait,
      "Runway dubAudio",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
