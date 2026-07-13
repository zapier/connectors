// Audio delivery for tools whose result is audio. ElevenLabs returns raw audio
// bytes (or base64-in-JSON for voice-design previews) and issues no download
// URL for generated audio, so the connector materializes the audio itself:
// written to a temp file and returned as audio_path by default, or inlined as
// audio_base64 when the caller sets return_base64 (for consumers that cannot
// reach this host's filesystem, e.g. remote MCP).

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { z } from "zod";

/**
 * The shared output shape of every audio-producing tool. Exactly one of
 * audio_path / audio_base64 is present, chosen by the tool's return_base64
 * input (default: file path).
 */
export const GeneratedAudioSchema = z.object({
  content_type: z.string().describe("MIME type of the audio, e.g. audio/mpeg."),
  output_format: z
    .string()
    .describe("The codec_samplerate_bitrate the audio was generated in.")
    .optional(),
  history_item_id: z
    .string()
    .describe(
      "ID of this generation in your history; pass to downloadHistoryAudio to re-fetch the audio or to getHistoryItem for metadata.",
    )
    .optional(),
  size_bytes: z
    .number()
    .int()
    .describe("Size of the audio in bytes.")
    .optional(),
  audio_path: z
    .string()
    .describe(
      "Filesystem path to the written audio file (the default disposition). Present unless return_base64=true was set. Usable by agents that share the connector host's filesystem (CLI / local MCP).",
    )
    .optional(),
  audio_base64: z
    .string()
    .describe(
      "Base64-encoded audio bytes. Present only when return_base64=true was set; works in every consumption mode incl. remote MCP, but is large (30s of default-format MP3 is roughly 640 KB of base64), so it is opt-in.",
    )
    .optional(),
});

export type GeneratedAudio = z.infer<typeof GeneratedAudioSchema>;

const EXTENSION_BY_CODEC: Record<string, string> = {
  mp3: "mp3",
  pcm: "pcm",
  wav: "wav",
  ulaw: "ulaw",
  opus: "opus",
};

function audioFileExtension(
  contentType: string,
  outputFormat?: string,
): string {
  if (outputFormat !== undefined) {
    const codec = outputFormat.split("_")[0] ?? "";
    const extension = EXTENSION_BY_CODEC[codec];
    if (extension !== undefined) return extension;
  }
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  return "audio";
}

/**
 * Apply the audio disposition: write the bytes to a temp file and return its
 * path, or return them base64-inlined when `returnBase64` is set.
 */
export async function deliverAudio(opts: {
  bytes: Uint8Array;
  contentType: string;
  outputFormat?: string;
  returnBase64: boolean;
  filePrefix: string;
}): Promise<{ audio_path?: string; audio_base64?: string }> {
  if (opts.returnBase64) {
    return { audio_base64: Buffer.from(opts.bytes).toString("base64") };
  }
  const dir = path.join(tmpdir(), "elevenlabs-audio");
  await mkdir(dir, { recursive: true });
  const extension = audioFileExtension(opts.contentType, opts.outputFormat);
  const filePath = path.join(
    dir,
    `${opts.filePrefix}-${randomUUID()}.${extension}`,
  );
  await writeFile(filePath, opts.bytes);
  return { audio_path: filePath };
}

/**
 * Build the GeneratedAudio output from a binary-audio response.
 */
export async function generatedAudioFromResponse(
  res: Response,
  opts: { outputFormat?: string; returnBase64: boolean; filePrefix: string },
): Promise<GeneratedAudio> {
  const bytes = new Uint8Array(await res.arrayBuffer());
  const contentType =
    res.headers.get("content-type")?.split(";")[0] ?? "audio/mpeg";
  const historyItemId = res.headers.get("history-item-id");
  const audio = await deliverAudio({
    bytes,
    contentType,
    outputFormat: opts.outputFormat,
    returnBase64: opts.returnBase64,
    filePrefix: opts.filePrefix,
  });
  return {
    content_type: contentType,
    ...(opts.outputFormat !== undefined
      ? { output_format: opts.outputFormat }
      : {}),
    ...(historyItemId !== null ? { history_item_id: historyItemId } : {}),
    size_bytes: bytes.byteLength,
    ...audio,
  };
}
