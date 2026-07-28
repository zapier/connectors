import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/createWebhook.ts";

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

describe("createWebhook: run", () => {
  it("POSTs the webhook with the name in the body and returns the parsed webhook", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "w1",
        token: "tok",
        name: "poster",
        channel_id: "c1",
      });
    }) as typeof globalThis.fetch;

    const input = inputSchema.parse({ channel_id: "c1", name: "poster" });
    const { data: result } = await definition.run(input, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://discord.com/api/v10/channels/c1/webhooks",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      name: "poster",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("w1");
  });

  it("throws a ConnectorHttpError on a 4xx", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Missing Permissions" },
        { status: 403 },
      )) as never;

    const input = inputSchema.parse({ channel_id: "c1", name: "poster" });
    const err = await definition
      .run(input, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
