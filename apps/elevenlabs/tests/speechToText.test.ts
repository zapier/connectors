import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import speechToTextDefinition from "../scripts/speechToText.ts";

// run()'s TypeScript input type is the post-default (z.infer) shape, so
// defaulted fields read as required. Parsing the minimal input through the
// tool's own inputSchema applies the defaults type-safely.
const { inputSchema, outputSchema } = speechToTextDefinition;

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" },
  });
}

describe("speechToText: run", () => {
  it("POSTs a multipart form with source_url and the default model_id and returns the transcript JSON", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ text: "hello", language_code: "en" });
    }) as typeof globalThis.fetch;

    const { data } = await speechToTextDefinition.run(
      inputSchema.parse({ source_url: "https://example.com/audio.mp3" }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.elevenlabs.io/v1/speech-to-text");
    expect(calls[0]?.init?.method).toBe("POST");

    const requestBody = calls[0]?.init?.body;
    expect(requestBody).toBeInstanceOf(FormData);
    if (!(requestBody instanceof FormData)) throw new Error("not FormData");
    expect(requestBody.get("source_url")).toBe("https://example.com/audio.mp3");
    expect(requestBody.get("model_id")).toBe("scribe_v1");

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.text).toBe("hello");
    expect(data.language_code).toBe("en");
  });

  it("forwards optional transcription fields into the form", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ text: "hello" });
    }) as typeof globalThis.fetch;

    await speechToTextDefinition.run(
      {
        source_url: "https://example.com/audio.mp3",
        model_id: "scribe_v2",
        language_code: "en",
        diarize: true,
        num_speakers: 2,
      },
      { fetch: fakeFetch },
    );

    const requestBody = calls[0]?.init?.body;
    if (!(requestBody instanceof FormData)) throw new Error("not FormData");
    expect(requestBody.get("model_id")).toBe("scribe_v2");
    expect(requestBody.get("language_code")).toBe("en");
    expect(requestBody.get("diarize")).toBe("true");
    expect(requestBody.get("num_speakers")).toBe("2");
  });

  it("throws a ConnectorHttpError with the credit hint on 402", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          detail: {
            code: "insufficient_credits",
            message: "Credits exhausted.",
          },
        },
        { status: 402 },
      )) as typeof globalThis.fetch;

    const err = await speechToTextDefinition
      .run(inputSchema.parse({ source_url: "https://example.com/audio.mp3" }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(402);
    expect(httpErr.message).toContain("insufficient_credits");
    expect(httpErr.message).toContain("getUserSubscription");
  });
});
