#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwElevenLabsError } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    public_owner_id: z
      .string()
      .describe("The voice owner's public_owner_id, from searchVoiceLibrary."),
    voice_id: z
      .string()
      .describe("The library voice's voice_id, from searchVoiceLibrary."),
    new_name: z
      .string()
      .describe(
        'Name the voice will have in your account, e.g. "Documentary narrator".',
      ),
  })
  .strict();
const outputSchema = z.object({
  voice_id: z
    .string()
    .describe("The added voice's ID in your account; pass to textToSpeech."),
});

const definition = defineTool({
  name: "addSharedVoice",
  title: "Add Shared Voice",
  description:
    "Add a shared-library voice to your account. Get public_owner_id and voice_id from searchVoiceLibrary. Consumes one of the account's custom-voice slots — check availability with getUserSubscription; deleteVoice frees a slot.",
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
    const url = `https://api.elevenlabs.io/v1/voices/add/${encodeURIComponent(input.public_owner_id)}/${encodeURIComponent(input.voice_id)}`;
    const body: Record<string, unknown> = {};
    if (input.new_name !== undefined) body["new_name"] = input.new_name;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs addSharedVoice");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
