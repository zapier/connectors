import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteHistoryItemDefinition from "../scripts/deleteHistoryItem.ts";

const { outputSchema } = deleteHistoryItemDefinition;

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

describe("deleteHistoryItem: run", () => {
  it("DELETEs /v1/history/{history_item_id} and returns the schema-valid status", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ status: "ok" });
    }) as typeof globalThis.fetch;

    const { data } = await deleteHistoryItemDefinition.run(
      { history_item_id: "ja9xsmfGhxYcymxGcOGB" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.elevenlabs.io/v1/history/ja9xsmfGhxYcymxGcOGB",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it('returns { status: "ok" } on success', async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({ status: "ok" })) as typeof globalThis.fetch;

    const { data } = await deleteHistoryItemDefinition.run(
      { history_item_id: "ja9xsmfGhxYcymxGcOGB" },
      { fetch: fakeFetch },
    );

    expect(data).toEqual({ status: "ok" });
  });

  it("throws a ConnectorHttpError carrying the status + parsed body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          detail: { status: "invalid_api_key", message: "Invalid API key." },
        },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await deleteHistoryItemDefinition
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
