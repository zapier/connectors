import { existsSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { afterAll, describe, expect, it } from "vitest";

import isolateAudioDefinition from "../scripts/isolateAudio.ts";

// run()'s TypeScript input type is the post-default (z.infer) shape, so
// defaulted fields read as required. Happy paths parse the minimal input
// through the tool's own inputSchema to apply defaults type-safely; the
// validation tests spell the default out so the invalid source combination
// reaches run() itself.
const { inputSchema } = isolateAudioDefinition;

const AUDIO_BYTES = new Uint8Array([1, 2, 3]);
const AUDIO_BASE64 = Buffer.from(AUDIO_BYTES).toString("base64");

const sourceAudioPath = path.join(
  tmpdir(),
  `isolate-audio-test-source-${process.pid}.mp3`,
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

describe("isolateAudio: input validation", () => {
  it("rejects when both audio_url and audio_path are provided", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      audioResponse()) as typeof globalThis.fetch;

    await expect(
      isolateAudioDefinition.run(
        {
          return_base64: false,
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
      isolateAudioDefinition.run(
        { return_base64: false },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/exactly one of audio_url/i);
  });
});

describe("isolateAudio: run", () => {
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

    const { data } = await isolateAudioDefinition.run(
      inputSchema.parse({ audio_path: audioPath }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.elevenlabs.io/v1/audio-isolation");

    const requestBody = calls[0]?.init?.body;
    expect(requestBody).toBeInstanceOf(FormData);
    if (!(requestBody instanceof FormData)) throw new Error("not FormData");
    expect(requestBody.get("audio")).not.toBeNull();

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

    const { data } = await isolateAudioDefinition.run(
      inputSchema.parse({ audio_path: audioPath, return_base64: true }),
      { fetch: fakeFetch },
    );

    expect(data.audio_base64).toBe(AUDIO_BASE64);
    expect(data.audio_path).toBeUndefined();
  });

  it("throws a ConnectorHttpError with the credit hint on 402", async () => {
    const audioPath = await writeSourceAudioFile();
    const fakeFetch: typeof globalThis.fetch = (async () =>
      quotaErrorResponse()) as typeof globalThis.fetch;

    const err = await isolateAudioDefinition
      .run(inputSchema.parse({ audio_path: audioPath }), { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(402);
    expect(httpErr.message).toContain("insufficient_credits");
    expect(httpErr.message).toContain("getUserSubscription");
  });
});
