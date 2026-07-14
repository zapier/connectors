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
      .describe(
        "HTTPS URL or data URI of the audio clip. Duration must be greater than 4.6s and less than 3600s.",
      ),
    model: z
      .string()
      .describe(
        "Voice-isolation model. Required — no default; the caller chooses. Recommended: eleven_voice_isolation. New Runway models work here without a connector update.",
      ),
    wait: waitInputField,
  })
  .strict();

const definition = defineTool({
  name: "isolateVoice",
  title: "Isolate Voice",
  description:
    "Remove background audio and isolate the voice in an audio clip. Asynchronous: returns a task id (poll getTask for the finished audio URL), or set wait: true to block until it finishes.",
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
      "/voice_isolation",
      rest,
      wait,
      "Runway isolateVoice",
    );
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
