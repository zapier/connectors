import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getVideoTranslationDefinition from "../scripts/getVideoTranslation.ts";

const { inputSchema, outputSchema } = getVideoTranslationDefinition;

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

describe("getVideoTranslation: inputSchema", () => {
  it("accepts a video_translation_id", () => {
    expect(
      inputSchema.safeParse({ video_translation_id: "vt_123" }).success,
    ).toBe(true);
  });

  it("requires video_translation_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("getVideoTranslation: governance", () => {
  it("is read-only", () => {
    expect(getVideoTranslationDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getVideoTranslation: run", () => {
  it("GETs /v3/video-translations/{id} and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          id: "vt_123",
          status: "completed",
          output_language: "Spanish",
          video_url: "https://cdn.heygen.com/out.mp4",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getVideoTranslationDefinition.run(
      { video_translation_id: "vt_123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.heygen.com/v3/video-translations/vt_123",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("vt_123");
    expect(result.status).toBe("completed");
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "not_found", message: "no such translation" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getVideoTranslationDefinition
      .run({ video_translation_id: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
