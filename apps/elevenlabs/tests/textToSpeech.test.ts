import { existsSync } from "node:fs";

import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import textToSpeechDefinition from "../scripts/textToSpeech.ts";

// run()'s TypeScript input type is the post-default (z.infer) shape, so
// defaulted fields read as required. Parsing the minimal input through the
// tool's own inputSchema applies the defaults type-safely — the same parse
// run() performs internally.
const { inputSchema } = textToSpeechDefinition;

const AUDIO_BYTES = new Uint8Array([1, 2, 3]);
const AUDIO_BASE64 = Buffer.from(AUDIO_BYTES).toString("base64");

function audioResponse(): Response {
  return new Response(new Uint8Array(AUDIO_BYTES), {
    status: 200,
    headers: { "content-type": "audio/mpeg", "history-item-id": "hist_123" },
  });
}

function quotaErrorResponse(): Response {
  return new Response(
    JSON.stringify({
      detail: { code: "insufficient_credits", message: "Credits exhausted." },
    }),
    { status: 402, headers: { "content-type": "application/json" } },
  );
}

describe("textToSpeech: run", () => {
  it("writes the audio to a file by default with default output_format and model_id", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return audioResponse();
    }) as typeof globalThis.fetch;

    const { data } = await textToSpeechDefinition.run(
      inputSchema.parse({ voice_id: "voice123", text: "Hello there" }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const requestUrl = new URL(calls[0]?.url ?? "");
    expect(requestUrl.pathname).toBe("/v1/text-to-speech/voice123");
    expect(requestUrl.searchParams.get("output_format")).toBe("mp3_44100_128");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      text: "Hello there",
      model_id: "eleven_multilingual_v2",
    });

    expect(data.content_type).toBe("audio/mpeg");
    expect(data.size_bytes).toBe(3);
    expect(data.history_item_id).toBe("hist_123");
    expect(data.audio_base64).toBeUndefined();
    const audioPath = data.audio_path;
    expect(typeof audioPath).toBe("string");
    if (audioPath === undefined) throw new Error("audio_path missing");
    expect(existsSync(audioPath)).toBe(true);
  });

  it("returns audio_base64 instead of a file when return_base64 is true", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      audioResponse()) as typeof globalThis.fetch;

    const { data } = await textToSpeechDefinition.run(
      inputSchema.parse({
        voice_id: "voice123",
        text: "Hello there",
        return_base64: true,
      }),
      { fetch: fakeFetch },
    );

    expect(data.audio_base64).toBe(AUDIO_BASE64);
    expect(data.audio_path).toBeUndefined();
  });

  it("throws a ConnectorHttpError with the credit hint on 402", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      quotaErrorResponse()) as typeof globalThis.fetch;

    const err = await textToSpeechDefinition
      .run(inputSchema.parse({ voice_id: "voice123", text: "Hello there" }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(402);
    expect(httpErr.message).toContain("insufficient_credits");
    expect(httpErr.message).toContain("getUserSubscription");
  });
});
