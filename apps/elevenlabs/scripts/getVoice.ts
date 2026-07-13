#!/usr/bin/env node
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { throwElevenLabsError, VoiceSchema } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    voice_id: z.string().describe("Voice ID, e.g. JBFqnCBsd6RMkjVDRZzb."),
  })
  .strict();
const outputSchema = VoiceSchema;

const definition = defineTool({
  name: "getVoice",
  title: "Get Voice",
  description:
    "Get one voice's metadata by voice_id from listVoices, including its stored settings (the baseline a generation tool's voice_settings input overrides per-request) and a preview_url to audition it.",
  inputSchema,
  outputSchema,
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
  connection: "elevenlabs",
  run: async (input, ctx) => {
    const url = `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(input.voice_id)}`;
    const res = await ctx.fetch(url, {
      method: "GET",
    });
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs getVoice");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
