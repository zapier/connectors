import { existsSync } from "node:fs";

import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import downloadHistoryAudioDefinition from "../scripts/downloadHistoryAudio.ts";

// run()'s TypeScript input type is the post-default (z.infer) shape, so
// defaulted fields read as required. Parsing the minimal input through the
// tool's own inputSchema applies the defaults type-safely.
const { inputSchema } = downloadHistoryAudioDefinition;

const AUDIO_BYTES = new Uint8Array([1, 2, 3]);
const AUDIO_BASE64 = Buffer.from(AUDIO_BYTES).toString("base64");

// Stored-audio responses carry no history-item-id header; the tool echoes the
// input id into the output instead.
function audioResponse(): Response {
  return new Response(new Uint8Array(AUDIO_BYTES), {
    status: 200,
    headers: { "content-type": "audio/mpeg" },
  });
}

describe("downloadHistoryAudio: run", () => {
  it("GETs the history audio, writes it to a file, and echoes the input history_item_id", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return audioResponse();
    }) as typeof globalThis.fetch;

    const { data } = await downloadHistoryAudioDefinition.run(
      inputSchema.parse({ history_item_id: "hist_echo_456" }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.elevenlabs.io/v1/history/hist_echo_456/audio",
    );
    expect(calls[0]?.init?.method).toBe("GET");

    expect(data.history_item_id).toBe("hist_echo_456");
    expect(data.content_type).toBe("audio/mpeg");
    expect(data.size_bytes).toBe(3);
    expect(data.audio_base64).toBeUndefined();
    const audioPath = data.audio_path;
    expect(typeof audioPath).toBe("string");
    if (audioPath === undefined) throw new Error("audio_path missing");
    expect(existsSync(audioPath)).toBe(true);
  });

  it("returns audio_base64 instead of a file when return_base64 is true", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      audioResponse()) as typeof globalThis.fetch;

    const { data } = await downloadHistoryAudioDefinition.run(
      { history_item_id: "hist_echo_456", return_base64: true },
      { fetch: fakeFetch },
    );

    expect(data.audio_base64).toBe(AUDIO_BASE64);
    expect(data.audio_path).toBeUndefined();
    expect(data.history_item_id).toBe("hist_echo_456");
  });

  it("throws a ConnectorHttpError with the credit hint on 402", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          detail: {
            code: "insufficient_credits",
            message: "Credits exhausted.",
          },
        }),
        { status: 402, headers: { "content-type": "application/json" } },
      )) as typeof globalThis.fetch;

    const err = await downloadHistoryAudioDefinition
      .run(inputSchema.parse({ history_item_id: "hist_echo_456" }), {
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
