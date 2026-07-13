import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listModelsDefinition from "../scripts/listModels.ts";

const { outputSchema } = listModelsDefinition;

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

// The ElevenLabs /v1/models endpoint returns a bare array on the wire.
const bareModelArray = [
  {
    model_id: "eleven_multilingual_v2",
    name: "Eleven Multilingual v2",
    description: "State-of-the-art multilingual model.",
    can_do_text_to_speech: true,
    can_do_voice_conversion: false,
    languages: [{ language_id: "en", name: "English" }],
    maximum_text_length_per_request: 10000,
  },
  {
    model_id: "eleven_turbo_v2_5",
    name: "Eleven Turbo v2.5",
    can_do_text_to_speech: true,
  },
];

describe("listModels: run", () => {
  it("GETs /v1/models and returns a schema-valid models list", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(bareModelArray);
    }) as typeof globalThis.fetch;

    const { data } = await listModelsDefinition.run({}, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.elevenlabs.io/v1/models");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.models).toHaveLength(2);
    expect(data.models[0]?.model_id).toBe("eleven_multilingual_v2");
  });

  it("wraps the bare wire array as { models: [...] }", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(bareModelArray)) as typeof globalThis.fetch;

    const { data } = await listModelsDefinition.run({}, { fetch: fakeFetch });

    expect(Array.isArray(data)).toBe(false);
    expect(data).toEqual({ models: bareModelArray });
  });

  it("throws a ConnectorHttpError carrying the status + parsed body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          detail: { status: "invalid_api_key", message: "Invalid API key." },
        },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listModelsDefinition
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
