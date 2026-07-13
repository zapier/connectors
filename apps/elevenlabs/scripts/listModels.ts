#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwElevenLabsError } from "../lib/elevenlabs.ts";

const inputSchema = z.object({}).strict();
const outputSchema = z.object({
  models: z.array(
    z
      .object({
        model_id: z.string().describe("Model ID, e.g. eleven_multilingual_v2."),
        name: z.string(),
        description: z.string().nullable().optional(),
        can_do_text_to_speech: z
          .boolean()
          .nullable()
          .describe("True when the model is usable with textToSpeech.")
          .optional(),
        can_do_voice_conversion: z.boolean().nullable().optional(),
        languages: z
          .array(
            z.object({
              language_id: z
                .string()
                .describe('Language identifier, e.g. "en".')
                .optional(),
              name: z.string().optional(),
            }),
          )
          .nullable()
          .describe("Languages the model supports.")
          .optional(),
        maximum_text_length_per_request: z
          .number()
          .int()
          .nullable()
          .describe(
            "Maximum characters per textToSpeech request for this model.",
          )
          .optional(),
      })
      .describe("A generation model and its capabilities."),
  ),
});

const definition = defineTool({
  name: "listModels",
  title: "List Models",
  description:
    "List available models with capabilities (can_do_text_to_speech), supported languages, and per-request character limits — the resolver for model_id inputs.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "elevenlabs",
  run: async (_input, ctx) => {
    const url = `https://api.elevenlabs.io/v1/models`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs listModels");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = { models: wirePayload };
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
