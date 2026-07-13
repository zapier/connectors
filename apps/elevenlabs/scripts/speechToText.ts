#!/usr/bin/env node
// Multipart endpoint: the agent-facing input is a plain URL + scalar options;
// the multipart form the wire expects is assembled here.
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { postMultipart, throwElevenLabsError } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    source_url: z
      .string()
      .describe(
        "HTTPS URL of the audio or video to transcribe. Hosted files and supported video platforms are accepted.",
      ),
    model_id: z
      .enum(["scribe_v1", "scribe_v2"])
      .default("scribe_v1")
      .describe("Transcription model. Defaults to scribe_v1."),
    language_code: z
      .string()
      .describe(
        'ISO 639-1 or 639-3 code of the audio language, e.g. "en". Omit to auto-detect.',
      )
      .optional(),
    diarize: z
      .boolean()
      .describe("Annotate which speaker is talking. Default false.")
      .optional(),
    num_speakers: z
      .number()
      .int()
      .gte(1)
      .lte(32)
      .describe("Maximum number of speakers, 1 to 32. Omit to auto-detect.")
      .optional(),
    tag_audio_events: z
      .boolean()
      .describe("Tag events like (laughter) in the transcript. Default true.")
      .optional(),
  })
  .strict();
const outputSchema = z.object({
  language_code: z
    .string()
    .describe(
      'Detected or enforced ISO code of the audio language — may be a three-letter code, e.g. "eng", so don\'t pass it straight to inputs that expect two-letter ISO 639-1.',
    )
    .optional(),
  language_probability: z
    .number()
    .describe("Confidence (0 to 1) of the language detection.")
    .optional(),
  text: z.string().describe("The full transcript."),
  words: z
    .array(
      z.object({
        text: z.string().optional(),
        type: z
          .string()
          .describe('"word", "spacing", or "audio_event" (e.g. laughter).')
          .optional(),
        start: z.number().describe("Start time in seconds.").optional(),
        end: z.number().describe("End time in seconds.").optional(),
        speaker_id: z
          .string()
          .describe(
            'Speaker label like "speaker_0"; present when diarize was true.',
          )
          .optional(),
      }),
    )
    .describe(
      "Per-word timing; present when the model returns word timestamps.",
    )
    .optional(),
});

const definition = defineTool({
  name: "speechToText",
  title: "Speech to Text",
  description:
    "Transcribe speech from an audio or video URL to text, with word timestamps, optional speaker diarization, and optional audio-event tags. Requires a direct connection (env:) — this endpoint's multipart requests aren't supported over a Zapier-managed connection yet.",
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
    const form = new FormData();
    form.append("source_url", input.source_url);
    form.append("model_id", input.model_id);
    if (input.language_code !== undefined)
      form.append("language_code", input.language_code);
    if (input.diarize !== undefined)
      form.append("diarize", String(input.diarize));
    if (input.num_speakers !== undefined)
      form.append("num_speakers", String(input.num_speakers));
    if (input.tag_audio_events !== undefined)
      form.append("tag_audio_events", String(input.tag_audio_events));
    // No Content-Type header: the runtime sets multipart/form-data with the boundary.
    const res = await postMultipart(
      ctx,
      "https://api.elevenlabs.io/v1/speech-to-text",
      form,
      "ElevenLabs speechToText",
    );
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs speechToText");
    return res.json();
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
