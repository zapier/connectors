// Audio sourcing for tools that transform existing audio (speechToSpeech,
// isolateAudio). The ElevenLabs API only accepts the source as multipart
// bytes, so the agent provides exactly one of: an HTTPS URL (downloaded here,
// then uploaded) or a local file path (read directly — the natural chain from
// another tool's audio_path output).

import { readFile } from "node:fs/promises";
import path from "node:path";

import { ConnectorHttpError, readResponseBody } from "@zapier/connectors-sdk";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".webm": "audio/webm",
  ".pcm": "audio/pcm",
  ".ulaw": "audio/basic",
};

/**
 * Load the source audio from `audio_url` or `audio_path` (the caller's input
 * schema enforces exactly one) and return it ready to append to a multipart
 * form. `label` names the calling tool in error messages.
 */
export async function loadAudioSource(
  source: { audio_url?: string; audio_path?: string },
  label: string,
): Promise<{ blob: Blob; filename: string }> {
  if (source.audio_url !== undefined) {
    const res = await globalThis.fetch(source.audio_url);
    if (!res.ok) {
      // Preserve the host's response (status, headers, body) on error.response
      // so the agent can see e.g. an expired-signature payload, not just the code.
      throw ConnectorHttpError.fromResponseBody(
        res,
        await readResponseBody(res),
        {
          message: `${label}: downloading audio_url failed with HTTP ${res.status} — check that the URL is correct and publicly reachable, or pass the audio as a local audio_path instead.`,
        },
      );
    }
    const bytes = await res.arrayBuffer();
    const type =
      res.headers.get("content-type")?.split(";")[0] ??
      "application/octet-stream";
    const urlFilename = path.basename(new URL(source.audio_url).pathname);
    return {
      blob: new Blob([bytes], { type }),
      filename: urlFilename !== "" ? urlFilename : "audio",
    };
  }
  if (source.audio_path === undefined) {
    throw new Error(
      `${label}: provide the source audio as audio_url or audio_path.`,
    );
  }
  let bytes: Buffer;
  try {
    bytes = await readFile(source.audio_path);
  } catch (err) {
    throw new Error(
      `${label}: reading audio_path "${source.audio_path}" failed (${err instanceof Error ? err.message : String(err)}) — pass a readable local file, e.g. the audio_path returned by another tool.`,
    );
  }
  const type =
    MIME_BY_EXTENSION[path.extname(source.audio_path).toLowerCase()] ??
    "application/octet-stream";
  return {
    blob: new Blob([new Uint8Array(bytes)], { type }),
    filename: path.basename(source.audio_path),
  };
}
