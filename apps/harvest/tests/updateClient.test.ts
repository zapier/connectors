import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/updateClient.ts";

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

// A valid instance of updateClient's outputSchema.
const cannedClient = {
  id: 5737632,
  name: "ABC Corp (renamed)",
  is_active: false,
  address: null,
  currency: "USD",
  created_at: "2017-06-26T21:39:35Z",
  updated_at: "2017-06-26T21:44:57Z",
};

describe("updateClient: inputSchema", () => {
  it("accepts an id-only input", () => {
    expect(inputSchema.safeParse({ id: 5737632 }).success).toBe(true);
  });

  it("accepts a partial update", () => {
    expect(
      inputSchema.safeParse({ id: 5737632, is_active: false }).success,
    ).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(inputSchema.safeParse({ name: "x" }).success).toBe(false);
  });
});

describe("updateClient: governance", () => {
  it("is not read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("updateClient: run", () => {
  it("PATCHes /v2/clients/:id with only the provided fields", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(cannedClient);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { id: 5737632, name: "ABC Corp (renamed)", is_active: false },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.harvestapp.com/v2/clients/5737632");
    expect(calls[0]?.init?.method).toBe("PATCH");

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ name: "ABC Corp (renamed)", is_active: false });
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("currency");

    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("sets the User-Agent and Content-Type headers", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(cannedClient);
    }) as typeof globalThis.fetch;

    await definition.run({ id: 5737632, name: "x" }, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
    expect(headers.get("Content-Type")).toBe("application/json");
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
