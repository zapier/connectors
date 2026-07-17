import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import designVoiceDefinition from "../scripts/designVoice.ts";

const { inputSchema, outputSchema } = designVoiceDefinition;

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

describe("designVoice: inputSchema", () => {
  it("accepts a minimal prompt", () => {
    expect(
      inputSchema.safeParse({ prompt: "warm confident female narrator" })
        .success,
    ).toBe(true);
  });

  it("requires prompt", () => {
    expect(inputSchema.safeParse({ gender: "female" }).success).toBe(false);
  });
});

describe("designVoice: governance", () => {
  it("is a non-read-only, non-destructive write", () => {
    expect(designVoiceDefinition.annotations?.readOnlyHint).toBe(false);
    expect(designVoiceDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("designVoice: run", () => {
  it("POSTs to /v3/voices and unwraps the {data} envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          voices: [
            {
              voice_id: "v1",
              name: "Aria",
              language: "English",
              gender: "female",
              type: "private",
            },
          ],
          seed: 0,
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await designVoiceDefinition.run(
      { prompt: "warm confident female narrator" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.heygen.com/v3/voices");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      prompt: "warm confident female narrator",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.voices).toHaveLength(1);
  });

  it("throws a ConnectorHttpError carrying the status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "bad_prompt", message: "invalid" } },
        { status: 422 },
      )) as typeof globalThis.fetch;

    const err = await designVoiceDefinition
      .run({ prompt: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(422);
  });
});
