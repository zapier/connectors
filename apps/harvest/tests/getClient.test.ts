import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/getClient.ts";

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

// A valid instance of getClient's outputSchema.
const cannedClient = {
  id: 5735776,
  name: "123 Industries",
  is_active: true,
  address: "123 Main St",
  currency: "EUR",
  created_at: "2017-06-26T21:02:12Z",
  updated_at: "2017-06-26T21:34:11Z",
};

describe("getClient: inputSchema", () => {
  it("accepts a valid id", () => {
    expect(inputSchema.safeParse({ id: 5735776 }).success).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: 1.5 }).success).toBe(false);
  });
});

describe("getClient: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getClient: run", () => {
  it("GETs /v2/clients/:id and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(cannedClient);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { id: 5735776 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.harvestapp.com/v2/clients/5735776");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.name).toBe("123 Industries");
  });

  it("sets the User-Agent header", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(cannedClient);
    }) as typeof globalThis.fetch;

    await definition.run({ id: 5735776 }, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
  });

  it("throws a ConnectorHttpError carrying status + body on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not Found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({ id: 999 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
