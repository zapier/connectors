import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/listClients.ts";

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

// A valid instance of listClients' outputSchema.
const cannedList = {
  page: 1,
  total_pages: 1,
  total_entries: 1,
  next_page: null,
  previous_page: null,
  links: {
    first: "https://api.harvestapp.com/v2/clients?page=1&per_page=20",
    next: null,
    previous: null,
    last: "https://api.harvestapp.com/v2/clients?page=1&per_page=20",
  },
  clients: [
    {
      id: 5735776,
      name: "123 Industries",
      is_active: true,
      address: "123 Main St",
      currency: "EUR",
      created_at: "2017-06-26T21:02:12Z",
      updated_at: "2017-06-26T21:34:11Z",
    },
  ],
};

describe("listClients: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the documented filters", () => {
    expect(
      inputSchema.safeParse({ is_active: true, per_page: 50 }).success,
    ).toBe(true);
  });

  it("rejects a per_page above the max (2000)", () => {
    expect(inputSchema.safeParse({ per_page: 2001 }).success).toBe(false);
  });
});

describe("listClients: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listClients: run", () => {
  it("GETs /v2/clients applying the default per_page=20 when omitted", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(cannedList);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run({}, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.harvestapp.com/v2/clients?per_page=20",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.clients).toHaveLength(1);
  });

  it("puts the is_active filter and an explicit per_page in the query string", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(cannedList);
    }) as typeof globalThis.fetch;

    await definition.run(
      { is_active: false, per_page: 100 },
      { fetch: fakeFetch },
    );

    const parsed = new URL(calls[0]?.url as string);
    expect(parsed.searchParams.get("is_active")).toBe("false");
    expect(parsed.searchParams.get("per_page")).toBe("100");
  });

  it("sets the User-Agent header", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(cannedList);
    }) as typeof globalThis.fetch;

    await definition.run({}, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
  });

  it("throws a ConnectorHttpError carrying status on 401", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Unauthorized" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
