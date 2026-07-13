#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwElevenLabsError, VoiceSchema } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    voice_name: z
      .string()
      .describe(
        'Name the voice will have in your account, e.g. "Irish narrator".',
      ),
    voice_description: z
      .string()
      .min(20)
      .max(1000)
      .describe("Description stored with the voice, 20 to 1000 characters."),
    generated_voice_id: z
      .string()
      .describe("The chosen preview's generated_voice_id from designVoice."),
    labels: z
      .record(z.string(), z.string())
      .describe("Optional metadata tags, e.g. accent, gender, use case.")
      .optional(),
  })
  .strict();
const outputSchema = VoiceSchema;

const definition = defineTool({
  name: "createVoiceFromDesign",
  title: "Create Voice From Design",
  description:
    "Create an account voice from a preview returned by designVoice. Pass the chosen generated_voice_id together with a name and description. Consumes one of the account's custom-voice slots — check availability with getUserSubscription; deleteVoice frees a slot.",
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
    const url = `https://api.elevenlabs.io/v1/text-to-voice`;
    const body: Record<string, unknown> = {};
    if (input.voice_name !== undefined) body["voice_name"] = input.voice_name;
    if (input.voice_description !== undefined)
      body["voice_description"] = input.voice_description;
    if (input.generated_voice_id !== undefined)
      body["generated_voice_id"] = input.generated_voice_id;
    if (input.labels !== undefined) body["labels"] = input.labels;
    const res = await ctx.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok)
      await throwElevenLabsError(res, "ElevenLabs createVoiceFromDesign");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
