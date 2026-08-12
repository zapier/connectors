import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/listContacts.ts";

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

// A valid instance of listContacts' outputSchema.
const cannedList = {
  page: 1,
  total_pages: 1,
  total_entries: 1,
  next_page: null,
  previous_page: null,
  links: {
    first: "https://api.harvestapp.com/v2/contacts?page=1&per_page=20",
    next: null,
    previous: null,
    last: "https://api.harvestapp.com/v2/contacts?page=1&per_page=20",
  },
  contacts: [
    {
      id: 4706510,
      title: "Owner",
      first_name: "George",
      last_name: "Frank",
      email: "george@example.com",
      phone_office: "555-1234",
      phone_mobile: null,
      fax: null,
      client: { id: 5735776, name: "123 Industries" },
      created_at: "2017-06-26T21:20:07Z",
      updated_at: "2017-06-26T21:27:07Z",
    },
  ],
};

describe("listContacts: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the client_id filter", () => {
    expect(inputSchema.safeParse({ client_id: 5735776 }).success).toBe(true);
  });

  it("rejects a per_page below the min (1)", () => {
    expect(inputSchema.safeParse({ per_page: 0 }).success).toBe(false);
  });
});

describe("listContacts: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listContacts: run", () => {
  it("GETs /v2/contacts applying the default per_page=20", async () => {
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
      "https://api.harvestapp.com/v2/contacts?per_page=20",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.contacts).toHaveLength(1);
  });

  it("puts the client_id filter in the query string", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(cannedList);
    }) as typeof globalThis.fetch;

    await definition.run({ client_id: 5735776 }, { fetch: fakeFetch });

    const parsed = new URL(calls[0]?.url as string);
    expect(parsed.searchParams.get("client_id")).toBe("5735776");
    expect(parsed.searchParams.get("per_page")).toBe("20");
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
