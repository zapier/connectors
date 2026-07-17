import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createVideoDefinition from "../scripts/createVideo.ts";

const { inputSchema, outputSchema } = createVideoDefinition;

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

describe("createVideo: inputSchema", () => {
  it("accepts an avatar video with a script + voice", () => {
    expect(
      inputSchema.safeParse({
        type: "avatar",
        avatar_id: "look_123",
        script: "Hello world",
        voice_id: "voice_123",
      }).success,
    ).toBe(true);
  });

  it("rejects two visual sources (mutually exclusive)", () => {
    expect(
      inputSchema.safeParse({
        type: "avatar",
        avatar_id: "look_123",
        image_url: "https://example.com/a.png",
      }).success,
    ).toBe(false);
  });

  it("rejects two audio sources (mutually exclusive)", () => {
    expect(
      inputSchema.safeParse({
        type: "avatar",
        avatar_id: "look_123",
        script: "hi",
        audio_url: "https://example.com/a.mp3",
      }).success,
    ).toBe(false);
  });

  it("requires type", () => {
    expect(inputSchema.safeParse({ avatar_id: "look_123" }).success).toBe(
      false,
    );
  });
});

describe("createVideo: governance", () => {
  it("is a non-read-only, non-destructive write", () => {
    expect(createVideoDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createVideoDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createVideo: run", () => {
  it("POSTs to /v3/videos and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: { video_id: "v_abc123", status: "waiting", output_format: "mp4" },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await createVideoDefinition.run(
      { type: "avatar", avatar_id: "look_123", script: "hi", voice_id: "v1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/videos");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      type: "avatar",
      avatar_id: "look_123",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.video_id).toBe("v_abc123");
  });

  it("throws a ConnectorHttpError carrying the status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "insufficient_credit", message: "no credits" } },
        { status: 402 },
      )) as typeof globalThis.fetch;

    const err = await createVideoDefinition
      .run(
        { type: "avatar", avatar_id: "look_123", script: "hi", voice_id: "v1" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(402);
  });
});
