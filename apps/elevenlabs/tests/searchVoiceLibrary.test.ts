import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import searchVoiceLibraryDefinition from "../scripts/searchVoiceLibrary.ts";

const { outputSchema } = searchVoiceLibraryDefinition;

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

const libraryPage = {
  voices: [
    {
      public_owner_id: "owner123abc",
      voice_id: "sharedVoice456",
      name: "Documentary Narrator",
      category: "professional",
      gender: "female",
      age: "middle_aged",
      accent: "american",
      language: "en",
      locale: "en-US",
      description: "Calm and clear narration.",
      use_case: "narrative_story",
      preview_url: "https://storage.elevenlabs.io/sample.mp3",
      free_users_allowed: true,
      date_unix: 1700000000,
    },
  ],
  has_more: true,
};

describe("searchVoiceLibrary: run", () => {
  it("GETs /v1/shared-voices with the filters and returns a schema-valid page", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(libraryPage);
    }) as typeof globalThis.fetch;

    const { data } = await searchVoiceLibraryDefinition.run(
      { search: "narrator", language: "en", gender: "female" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain(
      "https://api.elevenlabs.io/v1/shared-voices",
    );
    expect(calls[0]?.url).toContain("search=narrator");
    expect(calls[0]?.url).toContain("language=en");
    expect(calls[0]?.url).toContain("gender=female");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.voices[0]?.public_owner_id).toBe("owner123abc");
    expect(data.voices[0]?.voice_id).toBe("sharedVoice456");
    expect(data.has_more).toBe(true);
  });

  it("defaults page_size to 20 in the query string when omitted", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(libraryPage);
    }) as typeof globalThis.fetch;

    await searchVoiceLibraryDefinition.run({}, { fetch: fakeFetch });

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

    const err = await searchVoiceLibraryDefinition
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
