import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/executeWebhook.ts";

const { inputSchema, outputSchema } = definition;

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

describe("executeWebhook: run", () => {
  it("POSTs to /webhooks/{id}/{token}, sets the wait query param, and returns the message", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "m1",
        channel_id: "c1",
        content: "hello",
        timestamp: "2020-01-01T00:00:00+00:00",
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      webhook_id: "w1",
      webhook_token: "tok",
      content: "hello",
    });
    const { data: result } = await definition.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    const parsed = new URL(calls[0]?.url ?? "");
    expect(parsed.origin + parsed.pathname).toBe(
      "https://discord.com/api/v10/webhooks/w1/tok",
    );
    expect(parsed.searchParams.get("wait")).toBe("true");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      content: "hello",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.content).toBe("hello");
  });

  it("always sets wait=true so the created message is returned", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({
        id: "m1",
        channel_id: "c1",
        content: "hi",
        timestamp: "2020-01-01T00:00:00+00:00",
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({
      webhook_id: "w1",
      webhook_token: "tok",
      content: "hi",
    });
    await definition.run(input, { fetch: fakeFetch });

    expect(new URL(calls[0]?.url ?? "").searchParams.get("wait")).toBe("true");
  });

  it("throws a ConnectorHttpError on a 4xx", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({ message: "Unknown Webhook" }, { status: 404 })) as never;

    const input = inputSchema.parse({
      webhook_id: "w1",
      webhook_token: "tok",
      content: "hi",
    });
    const err = await definition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
