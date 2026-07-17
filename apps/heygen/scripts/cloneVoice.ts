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
    voice_name: z.string().describe("Display name for the cloned voice."),
    audio_url: z
      .string()
      .describe(
        "Public HTTPS URL of the reference audio to clone (or provide audio_asset_id). Fields `audio_url` and `audio_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    audio_asset_id: z
      .string()
      .describe(
        "HeyGen asset id of the reference audio. Fields `audio_url` and `audio_asset_id` are mutually exclusive — pass at most one.",
      )
      .optional(),
    language: z
      .string()
      .describe('Language hint, e.g. "en" (auto-detected if omitted).')
      .optional(),
    remove_background_noise: z
      .boolean()
      .describe("Remove background noise from the audio before cloning.")
      .optional(),
  })
  .strict()
  .refine(
    (input) =>
      [input.audio_url, input.audio_asset_id].filter((v) => v !== undefined)
        .length <= 1,
    {
      message:
        "Fields `audio_url` and `audio_asset_id` are mutually exclusive — pass at most one.",
      path: ["audio_url"],
    },
  )
  .meta({ allOf: [{ not: { required: ["audio_url", "audio_asset_id"] } }] });
const outputSchema = z.object({
  voice_clone_id: z
    .string()
    .describe(
      "Cloned voice id; use as a voice_id once ready. Poll getVoice for readiness.",
    ),
});

const definition = defineTool({
  name: "cloneVoice",
  title: "Clone Voice",
  description:
    "Clone a voice from a reference audio file. Returns a voice_clone_id usable as a voice_id in generateSpeech / createVideo once ready; poll getVoice with the voice_clone_id until the clone is ready.",
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
    const url = `https://api.heygen.com/v3/voices/clone`;
    const body: Record<string, unknown> = {};
    if (input.voice_name !== undefined) body["voice_name"] = input.voice_name;
    if (input.audio_url !== undefined) body["audio_url"] = input.audio_url;
    if (input.audio_asset_id !== undefined)
      body["audio_asset_id"] = input.audio_asset_id;
    if (input.language !== undefined) body["language"] = input.language;
    if (input.remove_background_noise !== undefined)
      body["remove_background_noise"] = input.remove_background_noise;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await throwIfNotOk(res, "Heygen cloneVoice");
    type WireJson = { readonly [key: string]: WireJson } & readonly WireJson[];
    const wirePayload = (await res.json()) as WireJson;
    const payload = wirePayload.data;
    return payload;
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
