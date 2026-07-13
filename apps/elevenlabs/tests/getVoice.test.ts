import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getVoiceDefinition from "../scripts/getVoice.ts";

const { outputSchema } = getVoiceDefinition;

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

const voice = {
  voice_id: "JBFqnCBsd6RMkjVDRZzb",
  name: "George",
  category: "premade",
  description: "Warm British narrator.",
  labels: { accent: "british", gender: "male" },
  preview_url: "https://storage.elevenlabs.io/george.mp3",
  is_legacy: false,
  created_at_unix: null,
  settings: { stability: 0.5, similarity_boost: 0.75, style: 0 },
};

describe("getVoice: run", () => {
  it("GETs /v1/voices/{voice_id} and returns the schema-valid voice", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(voice);
    }) as typeof globalThis.fetch;

    const { data } = await getVoiceDefinition.run(
      { voice_id: "JBFqnCBsd6RMkjVDRZzb" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.elevenlabs.io/v1/voices/JBFqnCBsd6RMkjVDRZzb",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.voice_id).toBe("JBFqnCBsd6RMkjVDRZzb");
    expect(data.name).toBe("George");
  });

  it("URL-encodes the voice_id path segment", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(voice);
    }) as typeof globalThis.fetch;

    await getVoiceDefinition.run(
      { voice_id: "abc/def?x" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.elevenlabs.io/v1/voices/abc%2Fdef%3Fx",
    );
  });

  it("throws a ConnectorHttpError carrying the status + parsed body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          detail: { status: "invalid_api_key", message: "Invalid API key." },
        },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await getVoiceDefinition
      .run({ voice_id: "nope" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(401);
    expect(httpErr.response.body).toMatchObject({
      detail: { status: "invalid_api_key" },
    });
  });
});
