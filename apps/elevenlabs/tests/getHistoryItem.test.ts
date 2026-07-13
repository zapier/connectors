import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getHistoryItemDefinition from "../scripts/getHistoryItem.ts";

const { outputSchema } = getHistoryItemDefinition;

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

const historyItem = {
  history_item_id: "ja9xsmfGhxYcymxGcOGB",
  request_id: "req123",
  voice_id: "JBFqnCBsd6RMkjVDRZzb",
  voice_name: "George",
  model_id: "eleven_multilingual_v2",
  text: "Hello world.",
  date_unix: 1700000000,
  content_type: "audio/mpeg",
  state: "created",
  source: "TTS",
  character_count_change_from: 100,
  character_count_change_to: 112,
};

describe("getHistoryItem: run", () => {
  it("GETs /v1/history/{history_item_id} and returns the schema-valid item", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(historyItem);
    }) as typeof globalThis.fetch;

    const { data } = await getHistoryItemDefinition.run(
      { history_item_id: "ja9xsmfGhxYcymxGcOGB" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.elevenlabs.io/v1/history/ja9xsmfGhxYcymxGcOGB",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.history_item_id).toBe("ja9xsmfGhxYcymxGcOGB");
    expect(data.text).toBe("Hello world.");
  });

  it("URL-encodes the history_item_id path segment", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(historyItem);
    }) as typeof globalThis.fetch;

    await getHistoryItemDefinition.run(
      { history_item_id: "abc/def" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.elevenlabs.io/v1/history/abc%2Fdef",
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

    const err = await getHistoryItemDefinition
      .run({ history_item_id: "nope" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(401);
    expect(httpErr.response.body).toMatchObject({
      detail: { status: "invalid_api_key" },
    });
  });
});
