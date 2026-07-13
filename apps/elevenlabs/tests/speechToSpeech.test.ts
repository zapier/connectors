import { existsSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { afterAll, describe, expect, it } from "vitest";

import speechToSpeechDefinition from "../scripts/speechToSpeech.ts";

// run()'s TypeScript input type is the post-default (z.infer) shape, so
// defaulted fields read as required. Happy paths parse the minimal input
// through the tool's own inputSchema to apply defaults type-safely; the
// validation tests spell the defaults out so the invalid source combination
// reaches run() itself.
const { inputSchema } = speechToSpeechDefinition;

const SPEECH_TO_SPEECH_DEFAULTS = {
  model_id: "eleven_multilingual_sts_v2",
  output_format: "mp3_44100_128" as const,
  remove_background_noise: false,
  return_base64: false,
};

const AUDIO_BYTES = new Uint8Array([1, 2, 3]);
const AUDIO_BASE64 = Buffer.from(AUDIO_BYTES).toString("base64");

const sourceAudioPath = path.join(
  tmpdir(),
  `speech-to-speech-test-source-${process.pid}.mp3`,
);

afterAll(async () => {
  await rm(sourceAudioPath, { force: true });
});

async function writeSourceAudioFile(): Promise<string> {
  await writeFile(sourceAudioPath, new Uint8Array([9, 8, 7]));
  return sourceAudioPath;
}

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

describe("speechToSpeech: input validation", () => {
  it("rejects when both audio_url and audio_path are provided", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      audioResponse()) as typeof globalThis.fetch;

    await expect(
      speechToSpeechDefinition.run(
        {
          ...SPEECH_TO_SPEECH_DEFAULTS,
          voice_id: "voice123",
          audio_url: "https://example.com/a.mp3",
          audio_path: "/tmp/a.mp3",
        },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/exactly one of audio_url/i);
  });

  it("rejects when neither audio_url nor audio_path is provided", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      audioResponse()) as typeof globalThis.fetch;

    await expect(
      speechToSpeechDefinition.run(
        { ...SPEECH_TO_SPEECH_DEFAULTS, voice_id: "voice123" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/exactly one of audio_url/i);
  });
});

describe("speechToSpeech: run", () => {
  it("uploads a local audio_path as multipart form data and writes the result to a file", async () => {
    const audioPath = await writeSourceAudioFile();
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return audioResponse();
    }) as typeof globalThis.fetch;

    const { data } = await speechToSpeechDefinition.run(
      inputSchema.parse({
        voice_id: "voice123",
        audio_path: audioPath,
        voice_settings: { stability: 0.4, speed: 1.1 },
      }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const requestUrl = new URL(calls[0]?.url ?? "");
    expect(requestUrl.pathname).toBe("/v1/speech-to-speech/voice123");
    expect(requestUrl.searchParams.get("output_format")).toBe("mp3_44100_128");

    const requestBody = calls[0]?.init?.body;
    expect(requestBody).toBeInstanceOf(FormData);
    if (!(requestBody instanceof FormData)) throw new Error("not FormData");
    expect(requestBody.get("audio")).not.toBeNull();
    expect(requestBody.get("model_id")).toBe("eleven_multilingual_sts_v2");
    // voice_settings crosses the wire as a JSON string inside the form.
    expect(requestBody.get("voice_settings")).toBe(
      JSON.stringify({ stability: 0.4, speed: 1.1 }),
    );

    expect(data.content_type).toBe("audio/mpeg");
    expect(data.size_bytes).toBe(3);
    expect(data.history_item_id).toBe("hist_123");
    expect(data.audio_base64).toBeUndefined();
    const resultPath = data.audio_path;
    expect(typeof resultPath).toBe("string");
    if (resultPath === undefined) throw new Error("audio_path missing");
    expect(existsSync(resultPath)).toBe(true);
  });

  it("returns audio_base64 instead of a file when return_base64 is true", async () => {
    const audioPath = await writeSourceAudioFile();
    const fakeFetch: typeof globalThis.fetch = (async () =>
      audioResponse()) as typeof globalThis.fetch;

    const { data } = await speechToSpeechDefinition.run(
      inputSchema.parse({
        voice_id: "voice123",
        audio_path: audioPath,
        return_base64: true,
      }),
      { fetch: fakeFetch },
    );

    expect(data.audio_base64).toBe(AUDIO_BASE64);
    expect(data.audio_path).toBeUndefined();
  });

  it("translates the Zapier-managed-connection multipart failure into an actionable error", async () => {
    const audioPath = await writeSourceAudioFile();
    // The managed-connection fetch wrapper rejects non-string bodies with a
    // message matching /only accepts `?body|zapier-mode/i.
    const fakeFetch: typeof globalThis.fetch = (async () => {
      throw new Error("zapier-mode fetch only accepts `body` as a string");
    }) as typeof globalThis.fetch;

    await expect(
      speechToSpeechDefinition.run(
        inputSchema.parse({ voice_id: "voice123", audio_path: audioPath }),
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/aren't supported over a Zapier-managed connection/i);
  });

  it("throws a ConnectorHttpError with the credit hint on 402", async () => {
    const audioPath = await writeSourceAudioFile();
    const fakeFetch: typeof globalThis.fetch = (async () =>
      quotaErrorResponse()) as typeof globalThis.fetch;

    const err = await speechToSpeechDefinition
      .run(inputSchema.parse({ voice_id: "voice123", audio_path: audioPath }), {
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
