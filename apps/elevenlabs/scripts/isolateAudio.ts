#!/usr/bin/env node
// Binary audio endpoint: takes multipart audio bytes on the wire and returns
// raw audio bytes. The agent provides the source as a URL or local path; the
// form assembly and audio disposition live in lib/.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { loadAudioSource } from "../lib/audioInput.ts";
import {
  generatedAudioFromResponse,
  GeneratedAudioSchema,
} from "../lib/audioOutput.ts";
import { postMultipart, throwElevenLabsError } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    audio_url: z
      .string()
      .describe(
        "HTTPS URL of the audio to clean up. Provide this or audio_path, not both.",
      )
      .optional(),
    audio_path: z
      .string()
      .describe(
        "Local filesystem path of the audio to clean up — e.g. an audio_path returned by another tool. Provide this or audio_url, not both.",
      )
      .optional(),
    return_base64: z
      .boolean()
      .default(false)
      .describe(
        "If true, return the audio inline as audio_base64 instead of writing a file and returning audio_path. Use for consumers without filesystem access (e.g. remote MCP); note the base64 payload is large. Default false (file path).",
      ),
  })
  .strict()
  .superRefine((value, ctx) => {
    const provided = [value.audio_url, value.audio_path].filter(
      (v) => v !== undefined,
    ).length;
    if (provided !== 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide exactly one of audio_url (HTTPS URL) or audio_path (local file).",
      });
    }
  });
const outputSchema = GeneratedAudioSchema;

const definition = defineTool({
  name: "isolateAudio",
  title: "Isolate Audio",
  description:
    "Isolate the voice/speech in a recording by removing background noise. Provide the source as an HTTPS URL or a local file path (exactly one). The audio must be at least ~5 seconds long (the API rejects shorter clips). Requires a direct connection (env:) — audio uploads aren't supported over a Zapier-managed connection yet.",
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
    const source = await loadAudioSource(input, "ElevenLabs isolateAudio");
    const form = new FormData();
    form.append("audio", source.blob, source.filename);
    // No Content-Type header: the runtime sets multipart/form-data with the boundary.
    const res = await postMultipart(
      ctx,
      "https://api.elevenlabs.io/v1/audio-isolation",
      form,
      "ElevenLabs isolateAudio",
    );
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs isolateAudio");
    return generatedAudioFromResponse(res, {
      returnBase64: input.return_base64,
      filePrefix: "isolated-audio",
    });
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
