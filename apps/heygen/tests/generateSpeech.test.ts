import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import generateSpeechDefinition from "../scripts/generateSpeech.ts";

const { inputSchema, outputSchema } = generateSpeechDefinition;

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

describe("generateSpeech: inputSchema", () => {
  it("accepts text + voice_id", () => {
    expect(
      inputSchema.safeParse({ text: "Hello world", voice_id: "voice_123" })
        .success,
    ).toBe(true);
  });

  it("requires voice_id", () => {
    expect(inputSchema.safeParse({ text: "Hello world" }).success).toBe(false);
  });

  it("requires text", () => {
    expect(inputSchema.safeParse({ voice_id: "voice_123" }).success).toBe(
      false,
    );
  });
});

describe("generateSpeech: governance", () => {
  it("is a non-read-only, non-destructive write", () => {
    expect(generateSpeechDefinition.annotations?.readOnlyHint).toBe(false);
    expect(generateSpeechDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("generateSpeech: run", () => {
  it("POSTs to /v3/voices/speech and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          audio_url: "https://example.com/audio.mp3",
          duration: 3.5,
          request_id: "req_1",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await generateSpeechDefinition.run(
      { text: "Hello world", voice_id: "voice_123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/voices/speech");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      text: "Hello world",
      voice_id: "voice_123",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.audio_url).toBe("https://example.com/audio.mp3");
  });

  it("throws a ConnectorHttpError carrying the status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "invalid_voice", message: "bad voice" } },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await generateSpeechDefinition
      .run({ text: "hi", voice_id: "v1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
