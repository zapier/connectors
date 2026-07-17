import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getVoiceDefinition from "../scripts/getVoice.ts";

const { inputSchema, outputSchema } = getVoiceDefinition;

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

describe("getVoice: inputSchema", () => {
  it("accepts a voice_id", () => {
    expect(inputSchema.safeParse({ voice_id: "v1" }).success).toBe(true);
  });

  it("requires voice_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });
});

describe("getVoice: governance", () => {
  it("is read-only", () => {
    expect(getVoiceDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getVoice: run", () => {
  it("GETs /v3/voices/{voice_id} and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          voice_id: "v1",
          name: "Aria",
          language: "English",
          gender: "female",
          type: "public",
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getVoiceDefinition.run(
      { voice_id: "v1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/voices/v1");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.voice_id).toBe("v1");
  });

  it("throws a ConnectorHttpError carrying the status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "not_found", message: "no voice" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getVoiceDefinition
      .run({ voice_id: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
