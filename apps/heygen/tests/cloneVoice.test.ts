import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import cloneVoiceDefinition from "../scripts/cloneVoice.ts";

const { inputSchema, outputSchema } = cloneVoiceDefinition;

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

describe("cloneVoice: inputSchema", () => {
  it("accepts a name + a single audio source", () => {
    expect(
      inputSchema.safeParse({
        voice_name: "My Clone",
        audio_url: "https://example.com/ref.mp3",
      }).success,
    ).toBe(true);
  });

  it("requires voice_name", () => {
    expect(
      inputSchema.safeParse({ audio_url: "https://example.com/ref.mp3" })
        .success,
    ).toBe(false);
  });

  it("rejects both audio_url and audio_asset_id (mutually exclusive)", () => {
    expect(
      inputSchema.safeParse({
        voice_name: "My Clone",
        audio_url: "https://example.com/ref.mp3",
        audio_asset_id: "asset_123",
      }).success,
    ).toBe(false);
  });
});

describe("cloneVoice: governance", () => {
  it("is a non-read-only, non-destructive write", () => {
    expect(cloneVoiceDefinition.annotations?.readOnlyHint).toBe(false);
    expect(cloneVoiceDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("cloneVoice: run", () => {
  it("POSTs to /v3/voices/clone and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ data: { voice_clone_id: "clone_123" } });
    }) as typeof globalThis.fetch;

    const { data: result } = await cloneVoiceDefinition.run(
      { voice_name: "My Clone", audio_url: "https://example.com/ref.mp3" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/voices/clone");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      voice_name: "My Clone",
      audio_url: "https://example.com/ref.mp3",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.voice_clone_id).toBe("clone_123");
  });

  it("throws a ConnectorHttpError carrying the status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "invalid_audio", message: "bad audio" } },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await cloneVoiceDefinition
      .run(
        { voice_name: "My Clone", audio_url: "https://example.com/ref.mp3" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
