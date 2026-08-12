import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/createClient.ts";

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

// A valid instance of createClient's outputSchema.
const cannedClient = {
  id: 5737632,
  name: "ABC Corp",
  is_active: true,
  address: "456 Main St",
  currency: "USD",
  created_at: "2017-06-26T21:39:35Z",
  updated_at: "2017-06-26T21:39:35Z",
};

describe("createClient: inputSchema", () => {
  it("accepts a minimal valid input (name only)", () => {
    expect(inputSchema.safeParse({ name: "ABC Corp" }).success).toBe(true);
  });

  it("rejects a missing required name", () => {
    expect(inputSchema.safeParse({ currency: "USD" }).success).toBe(false);
  });

  it("rejects unknown fields (strict schema)", () => {
    expect(inputSchema.safeParse({ name: "ABC Corp", bogus: 1 }).success).toBe(
      false,
    );
  });
});

describe("createClient: run", () => {
  it("POSTs to /v2/clients with only the provided fields", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(cannedClient);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { name: "ABC Corp", currency: "USD" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.harvestapp.com/v2/clients");
    expect(calls[0]?.init?.method).toBe("POST");

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ name: "ABC Corp", currency: "USD" });
    expect(body).not.toHaveProperty("is_active");
    expect(body).not.toHaveProperty("address");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(5737632);
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

    await definition.run({ name: "ABC Corp" }, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws a ConnectorHttpError carrying status + body on 422", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Name can't be blank" },
        { status: 422 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({ name: "ABC Corp" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(422);
  });
});
