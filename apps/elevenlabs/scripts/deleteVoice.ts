#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwElevenLabsError } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    voice_id: z.string().describe("Voice ID from listVoices."),
  })
  .strict();
const outputSchema = z.object({
  status: z.string().describe('"ok" on success.'),
});

const definition = defineTool({
  name: "deleteVoice",
  title: "Delete Voice",
  description:
    "Delete a voice from your account by voice_id. Irreversible; premade voices can't be deleted.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "elevenlabs",
  run: async (input, ctx) => {
    const url = `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(input.voice_id)}`;
    const res = await ctx.fetch(url, {
      method: "DELETE",
    });
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs deleteVoice");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
