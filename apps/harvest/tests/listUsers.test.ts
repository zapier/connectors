import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/listUsers.ts";

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

const CANNED = {
  page: 1,
  total_pages: 1,
  total_entries: 1,
  next_page: null,
  previous_page: null,
  links: {
    first: "https://api.harvestapp.com/v2/users?page=1&per_page=20",
    next: null,
    previous: null,
    last: "https://api.harvestapp.com/v2/users?page=1&per_page=20",
  },
  users: [
    {
      id: 1782959,
      first_name: "Kim",
      last_name: "Allen",
      email: "kim@example.com",
      timezone: "Eastern Time (US & Canada)",
      is_active: true,
      is_contractor: false,
      weekly_capacity: 126000,
      default_hourly_rate: 100,
      cost_rate: 50,
      roles: ["Founder"],
      access_roles: ["administrator"],
    },
  ],
};

describe("listUsers: inputSchema", () => {
  it("accepts an empty input (lists everything)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the is_active filter", () => {
    expect(inputSchema.safeParse({ is_active: true }).success).toBe(true);
  });

  it("rejects per_page above the maximum", () => {
    expect(inputSchema.safeParse({ per_page: 5000 }).success).toBe(false);
  });
});

describe("listUsers: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listUsers: run", () => {
  it("GETs /v2/users with the default per_page=20 when omitted", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run({}, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.harvestapp.com/v2/users?per_page=20",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.users).toHaveLength(1);
  });

  it("carries the is_active filter and an overriding per_page in the query", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    await definition.run(
      { is_active: true, per_page: 100 },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]?.url as string);
    expect(url.searchParams.get("is_active")).toBe("true");
    expect(url.searchParams.get("per_page")).toBe("100");
  });

  it("sets the User-Agent header", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    await definition.run({}, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
  });

  it("throws a ConnectorHttpError carrying status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Forbidden" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
