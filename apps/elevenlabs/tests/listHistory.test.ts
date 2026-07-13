import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listHistoryDefinition from "../scripts/listHistory.ts";

const { outputSchema } = listHistoryDefinition;

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

const historyPage = {
  history: [
    {
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
    },
  ],
  has_more: true,
  last_history_item_id: "ja9xsmfGhxYcymxGcOGB",
};

describe("listHistory: run", () => {
  it("GETs /v1/history with the filters and returns a schema-valid page", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(historyPage);
    }) as typeof globalThis.fetch;

    const { data } = await listHistoryDefinition.run(
      { voice_id: "JBFqnCBsd6RMkjVDRZzb", source: "TTS" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("https://api.elevenlabs.io/v1/history");
    expect(calls[0]?.url).toContain("voice_id=JBFqnCBsd6RMkjVDRZzb");
    expect(calls[0]?.url).toContain("source=TTS");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.history).toHaveLength(1);
    expect(data.history[0]?.history_item_id).toBe("ja9xsmfGhxYcymxGcOGB");
    expect(data.has_more).toBe(true);
  });

  it("defaults page_size to 20 in the query string when omitted", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(historyPage);
    }) as typeof globalThis.fetch;

    await listHistoryDefinition.run({}, { fetch: fakeFetch });

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

    const err = await listHistoryDefinition
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
