import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import addSharedVoiceDefinition from "../scripts/addSharedVoice.ts";

const { outputSchema } = addSharedVoiceDefinition;

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

describe("addSharedVoice: run", () => {
  it("POSTs the new_name body and returns the schema-valid added voice_id", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ voice_id: "newVoiceInAccount123" });
    }) as typeof globalThis.fetch;

    const { data } = await addSharedVoiceDefinition.run(
      {
        public_owner_id: "owner123abc",
        voice_id: "sharedVoice456",
        new_name: "Documentary narrator",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      new_name: "Documentary narrator",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.voice_id).toBe("newVoiceInAccount123");
  });

  it("maps public_owner_id to the public_user_id path segment before the voice_id", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ voice_id: "newVoiceInAccount123" });
    }) as typeof globalThis.fetch;

    await addSharedVoiceDefinition.run(
      {
        public_owner_id: "ownerPublicId789",
        voice_id: "libraryVoiceId000",
        new_name: "My narrator",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.elevenlabs.io/v1/voices/add/ownerPublicId789/libraryVoiceId000",
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

    const err = await addSharedVoiceDefinition
      .run(
        {
          public_owner_id: "owner123abc",
          voice_id: "sharedVoice456",
          new_name: "Documentary narrator",
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(401);
    expect(httpErr.response.body).toMatchObject({
      detail: { status: "invalid_api_key" },
    });
  });
});
