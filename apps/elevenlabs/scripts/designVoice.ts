#!/usr/bin/env node
// This endpoint inlines each preview's audio as base64 in the JSON response
// (hundreds of KB per preview) — run() re-delivers each preview through the
// standard audio disposition (file path by default).
import { defineTool, handleIfScriptMain } from "@zapier/connectors-sdk";
import { z } from "zod";

import { connectionResolvers } from "../connections.ts";
import { deliverAudio } from "../lib/audioOutput.ts";
import { throwElevenLabsError } from "../lib/elevenlabs.ts";

const inputSchema = z
  .object({
    voice_description: z
      .string()
      .min(20)
      .max(1000)
      .describe(
        "Description of the voice to design, 20 to 1000 characters — cover gender, age, accent, tone, and delivery style.",
      ),
    text: z
      .string()
      .min(100)
      .max(1000)
      .describe(
        "Sample text the previews will speak, 100 to 1000 characters. Omit and set auto_generate_text to let the model write text suited to the description.",
      )
      .optional(),
    auto_generate_text: z
      .boolean()
      .default(false)
      .describe(
        "Generate preview text automatically from the voice description. Set true when text is omitted.",
      ),
    model_id: z
      .enum(["eleven_multilingual_ttv_v2", "eleven_ttv_v3"])
      .default("eleven_multilingual_ttv_v2")
      .describe("Voice-design model. Defaults to eleven_multilingual_ttv_v2."),
    loudness: z
      .number()
      .gte(-1)
      .lte(1)
      .describe(
        "Volume of the designed voice, -1 (quietest) to 1 (loudest). 0 is roughly -24 LUFS. Default 0.5.",
      )
      .optional(),
    guidance_scale: z
      .number()
      .gte(0)
      .lte(100)
      .describe(
        "How closely generation follows the description — lower is more creative, higher is more literal. Default 5.",
      )
      .optional(),
    seed: z
      .number()
      .int()
      .describe("Same seed + inputs reproduces the same candidate voices.")
      .optional(),
    return_base64: z
      .boolean()
      .default(false)
      .describe(
        "If true, return each preview inline as audio_base64 instead of writing files and returning audio_path per preview. Use for consumers without filesystem access (e.g. remote MCP); note the payloads are large. Default false (file paths).",
      ),
  })
  .strict();
const outputSchema = z.object({
  previews: z
    .array(
      z.object({
        generated_voice_id: z
          .string()
          .describe(
            "ID of this candidate; pass to createVoiceFromDesign to save it as an account voice.",
          ),
        audio_path: z
          .string()
          .describe(
            "Filesystem path to this candidate's preview audio file. Present unless return_base64=true was set.",
          )
          .optional(),
        audio_base64: z
          .string()
          .describe(
            "Base64-encoded preview audio; present only when return_base64=true was set.",
          )
          .optional(),
        media_type: z
          .string()
          .describe("MIME type of the preview audio, e.g. audio/mpeg.")
          .optional(),
        duration_secs: z
          .number()
          .describe("Preview length in seconds.")
          .optional(),
        language: z.string().describe("Language of the preview.").optional(),
      }),
    )
    .describe(
      "Candidate voices. Audition via each preview's audio, then pass the chosen generated_voice_id to createVoiceFromDesign.",
    ),
  text: z
    .string()
    .describe("The text the previews speak (provided or auto-generated).")
    .optional(),
});

type WirePreview = {
  generated_voice_id: string;
  audio_base_64: string;
  media_type: string;
  duration_secs: number;
  language: string;
};

const definition = defineTool({
  name: "designVoice",
  title: "Design Voice",
  description:
    'Design a synthetic voice from a text description (e.g. "a warm, gravelly male narrator in his 60s with a slight Irish accent"). Audition the returned previews, then save the chosen generated_voice_id with createVoiceFromDesign.',
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
    const body: Record<string, unknown> = {
      voice_description: input.voice_description,
      auto_generate_text: input.auto_generate_text,
      model_id: input.model_id,
    };
    if (input.text !== undefined) body["text"] = input.text;
    if (input.loudness !== undefined) body["loudness"] = input.loudness;
    if (input.guidance_scale !== undefined)
      body["guidance_scale"] = input.guidance_scale;
    if (input.seed !== undefined) body["seed"] = input.seed;
    const res = await ctx.fetch(
      "https://api.elevenlabs.io/v1/text-to-voice/design",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) await throwElevenLabsError(res, "ElevenLabs designVoice");
    const wire = (await res.json()) as {
      previews: WirePreview[];
      text: string;
    };
    const previews = await Promise.all(
      wire.previews.map(async (preview) => {
        const audio = await deliverAudio({
          bytes: new Uint8Array(Buffer.from(preview.audio_base_64, "base64")),
          contentType: preview.media_type,
          returnBase64: input.return_base64,
          filePrefix: "voice-preview",
        });
        return {
          generated_voice_id: preview.generated_voice_id,
          media_type: preview.media_type,
          duration_secs: preview.duration_secs,
          language: preview.language,
          ...audio,
        };
      }),
    );
    return { previews, text: wire.text };
  },
});

export default definition;

await handleIfScriptMain(import.meta, definition, { connectionResolvers });
