#!/usr/bin/env node
import {
  defineTool,
  handleIfScriptMain,
  throwIfNotOk,
} from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";

const inputSchema = z
  .object({
    prompt: z.string().describe("Description of the desired voice."),
    gender: z.string().describe("Bias results toward a gender.").optional(),
    locale: z.string().describe("Target locale.").optional(),
    seed: z
      .number()
      .int()
      .describe(
        "0 returns the first batch; increment for different suggestions.",
      )
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  voices: z.array(
    z.object({
      voice_id: z.string(),
      name: z.string(),
      language: z.string(),
      gender: z.string(),
      type: z.enum(["public", "private"]),
      preview_audio_url: z.union([z.string(), z.null()]).optional(),
      support_pause: z
        .boolean()
        .nullable()
        .describe("Whether the voice honors SSML pause/break tags.")
        .optional(),
      support_locale: z
        .boolean()
        .nullable()
        .describe("Whether the voice supports locale variants.")
        .optional(),
    }),
  ),
  seed: z.number().int(),
});

const definition = defineTool({
  name: "designVoice",
  title: "Design Voice",
  description:
    'Generate up to 3 candidate voices matching a natural-language description (e.g. "warm confident female narrator"). Use seed to get a different batch.',
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  connection: "heygen",
  run: async (input, ctx) => {
    const url = `https://api.heygen.com/v3/voices`;
    const body: Record<string, unknown> = {};
    if (input.prompt !== undefined) body["prompt"] = input.prompt;
    if (input.gender !== undefined) body["gender"] = input.gender;
    if (input.locale !== undefined) body["locale"] = input.locale;
    if (input.seed !== undefined) body["seed"] = input.seed;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Heygen designVoice");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
