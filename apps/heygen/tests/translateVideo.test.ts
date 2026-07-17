import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import translateVideoDefinition from "../scripts/translateVideo.ts";

const { inputSchema, outputSchema } = translateVideoDefinition;

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

describe("translateVideo: inputSchema", () => {
  it("accepts a video_url with output_languages", () => {
    expect(
      inputSchema.safeParse({
        video_url: "https://example.com/source.mp4",
        output_languages: ["Spanish", "French"],
      }).success,
    ).toBe(true);
  });

  it("requires output_languages", () => {
    expect(
      inputSchema.safeParse({ video_url: "https://example.com/source.mp4" })
        .success,
    ).toBe(false);
  });

  it("rejects both video_url and video_asset_id (mutually exclusive)", () => {
    expect(
      inputSchema.safeParse({
        video_url: "https://example.com/source.mp4",
        video_asset_id: "asset_123",
        output_languages: ["Spanish"],
      }).success,
    ).toBe(false);
  });
});

describe("translateVideo: governance", () => {
  it("is a non-read-only, non-destructive write", () => {
    expect(translateVideoDefinition.annotations?.readOnlyHint).toBe(false);
    expect(translateVideoDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("translateVideo: run", () => {
  it("POSTs to /v3/video-translations and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: { video_translation_ids: ["vt_1", "vt_2"] },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await translateVideoDefinition.run(
      {
        video_url: "https://example.com/source.mp4",
        output_languages: ["Spanish", "French"],
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/video-translations");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      video_url: "https://example.com/source.mp4",
      output_languages: ["Spanish", "French"],
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.video_translation_ids).toEqual(["vt_1", "vt_2"]);
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "bad_request", message: "invalid language" } },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await translateVideoDefinition
      .run(
        {
          video_url: "https://example.com/source.mp4",
          output_languages: ["Spanish"],
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
