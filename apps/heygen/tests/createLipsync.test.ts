import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createLipsyncDefinition from "../scripts/createLipsync.ts";

const { inputSchema, outputSchema } = createLipsyncDefinition;

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("createLipsync: inputSchema", () => {
  it("accepts a video_url + audio_url pair", () => {
    expect(
      inputSchema.safeParse({
        video_url: "https://example.com/source.mp4",
        audio_url: "https://example.com/voice.mp3",
      }).success,
    ).toBe(true);
  });

  it("rejects both video_url and video_asset_id (mutually exclusive)", () => {
    expect(
      inputSchema.safeParse({
        video_url: "https://example.com/source.mp4",
        video_asset_id: "asset_v",
        audio_url: "https://example.com/voice.mp3",
      }).success,
    ).toBe(false);
  });

  it("rejects both audio_url and audio_asset_id (mutually exclusive)", () => {
    expect(
      inputSchema.safeParse({
        video_url: "https://example.com/source.mp4",
        audio_url: "https://example.com/voice.mp3",
        audio_asset_id: "asset_a",
      }).success,
    ).toBe(false);
  });

  it("requires a video source (rejects a call with no video)", () => {
    expect(
      inputSchema.safeParse({ audio_url: "https://example.com/voice.mp3" })
        .success,
    ).toBe(false);
  });

  it("requires an audio source (rejects a call with no audio)", () => {
    expect(
      inputSchema.safeParse({ video_url: "https://example.com/source.mp4" })
        .success,
    ).toBe(false);
  });

  it("rejects a call with neither source (only a title)", () => {
    expect(inputSchema.safeParse({ title: "just a title" }).success).toBe(
      false,
    );
  });
});

describe("createLipsync: governance", () => {
  it("is a non-read-only, non-destructive write", () => {
    expect(createLipsyncDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createLipsyncDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createLipsync: run", () => {
  it("POSTs to /v3/lipsyncs and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ data: { lipsync_id: "ls_abc123" } });
    }) as typeof globalThis.fetch;

    const { data: result } = await createLipsyncDefinition.run(
      {
        video_url: "https://example.com/source.mp4",
        audio_url: "https://example.com/voice.mp3",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/lipsyncs");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      video_url: "https://example.com/source.mp4",
      audio_url: "https://example.com/voice.mp3",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.lipsync_id).toBe("ls_abc123");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "insufficient_credit", message: "no credits" } },
        { status: 402 },
      )) as typeof globalThis.fetch;

    const err = await createLipsyncDefinition
      .run(
        {
          video_url: "https://example.com/source.mp4",
          audio_url: "https://example.com/voice.mp3",
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(402);
  });
});
