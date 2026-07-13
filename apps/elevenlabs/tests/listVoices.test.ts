import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listVoicesDefinition from "../scripts/listVoices.ts";

const { outputSchema } = listVoicesDefinition;

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

const voicesPage = {
  voices: [
    {
      voice_id: "JBFqnCBsd6RMkjVDRZzb",
      name: "George",
      category: "premade",
      description: "Warm British narrator.",
      labels: { accent: "british", gender: "male" },
      preview_url: "https://storage.elevenlabs.io/george.mp3",
      settings: { stability: 0.5, similarity_boost: 0.75 },
    },
  ],
  has_more: false,
  next_page_token: null,
  total_count: 1,
};

describe("listVoices: run", () => {
  it("GETs /v2/voices with the search filter and returns a schema-valid page", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(voicesPage);
    }) as typeof globalThis.fetch;

    const { data } = await listVoicesDefinition.run(
      { search: "George" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("https://api.elevenlabs.io/v2/voices");
    expect(calls[0]?.url).toContain("search=George");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.voices).toHaveLength(1);
    expect(data.voices[0]?.voice_id).toBe("JBFqnCBsd6RMkjVDRZzb");
    expect(data.has_more).toBe(false);
  });

  it("defaults page_size to 20 in the query string when omitted", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(voicesPage);
    }) as typeof globalThis.fetch;

    await listVoicesDefinition.run({}, { fetch: fakeFetch });

    expect(calls[0]?.url).toContain("page_size=20");
  });

  it("throws a ConnectorHttpError carrying the status + parsed body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          detail: { status: "invalid_api_key", message: "Invalid API key." },
        },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listVoicesDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(401);
    expect(httpErr.response.body).toMatchObject({
      detail: { status: "invalid_api_key" },
    });
  });
});
