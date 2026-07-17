import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listVoicesDefinition from "../scripts/listVoices.ts";

const { inputSchema, outputSchema } = listVoicesDefinition;

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

describe("listVoices: inputSchema", () => {
  it("accepts an empty input (lists everything)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the documented filters", () => {
    expect(
      inputSchema.safeParse({
        type: "private",
        engine: "starfish",
        language: "English",
        gender: "female",
        limit: 50,
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown gender value", () => {
    expect(inputSchema.safeParse({ gender: "other" }).success).toBe(false);
  });
});

describe("listVoices: governance", () => {
  it("is read-only", () => {
    expect(listVoicesDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listVoices: run", () => {
  it("GETs /v3/voices and maps the {data} envelope to items", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: [
          {
            voice_id: "v1",
            name: "Aria",
            language: "English",
            gender: "female",
            type: "public",
          },
        ],
        has_more: false,
        next_token: null,
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listVoicesDefinition.run(
      { engine: "starfish" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const requested = new URL(calls[0]?.url as string);
    expect(requested.origin + requested.pathname).toBe(
      "https://api.heygen.com/v3/voices",
    );
    expect(requested.searchParams.get("engine")).toBe("starfish");
    expect(requested.searchParams.get("limit")).toBe("20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.has_more).toBe(false);
  });

  it("throws a ConnectorHttpError carrying the status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "unauthorized", message: "no auth" } },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listVoicesDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
