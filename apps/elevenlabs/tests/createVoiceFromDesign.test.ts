import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createVoiceFromDesignDefinition from "../scripts/createVoiceFromDesign.ts";

const { outputSchema } = createVoiceFromDesignDefinition;

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

const createdVoice = {
  voice_id: "savedDesignVoice123",
  name: "Irish narrator",
  category: "generated",
  description: "A middle-aged Irish man with a soft storytelling voice.",
  labels: { accent: "irish" },
  preview_url: "https://storage.elevenlabs.io/preview.mp3",
  created_at_unix: 1700000000,
  settings: { stability: 0.5, similarity_boost: 0.75 },
};

const validInput = {
  voice_name: "Irish narrator",
  voice_description: "A middle-aged Irish man with a soft storytelling voice.",
  generated_voice_id: "genVoicePreview456",
};

describe("createVoiceFromDesign: run", () => {
  it("POSTs to /v1/text-to-voice and returns the schema-valid saved voice", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(createdVoice);
    }) as typeof globalThis.fetch;

    const { data } = await createVoiceFromDesignDefinition.run(validInput, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.elevenlabs.io/v1/text-to-voice");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.voice_id).toBe("savedDesignVoice123");
    expect(data.name).toBe("Irish narrator");
  });

  it("sends the input fields (including labels) in the JSON body", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(createdVoice);
    }) as typeof globalThis.fetch;

    await createVoiceFromDesignDefinition.run(
      { ...validInput, labels: { accent: "irish", gender: "male" } },
      { fetch: fakeFetch },
    );

    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      voice_name: "Irish narrator",
      voice_description:
        "A middle-aged Irish man with a soft storytelling voice.",
      generated_voice_id: "genVoicePreview456",
      labels: { accent: "irish", gender: "male" },
    });
  });

  it("throws a ConnectorHttpError carrying the status + parsed body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          detail: { status: "invalid_api_key", message: "Invalid API key." },
        },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await createVoiceFromDesignDefinition
      .run(validInput, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(401);
    expect(httpErr.response.body).toMatchObject({
      detail: { status: "invalid_api_key" },
    });
  });
});
