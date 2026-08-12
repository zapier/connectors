import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/listTasks.ts";

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
    first: "https://api.harvestapp.com/v2/tasks?page=1&per_page=20",
    next: null,
    previous: null,
    last: "https://api.harvestapp.com/v2/tasks?page=1&per_page=20",
  },
  tasks: [
    {
      id: 8083800,
      name: "Programming",
      billable_by_default: true,
      default_hourly_rate: 100,
      is_default: true,
      is_active: true,
      created_at: "2021-01-01T00:00:00Z",
      updated_at: "2021-01-01T00:00:00Z",
    },
  ],
};

describe("listTasks: inputSchema", () => {
  it("accepts an empty input (lists everything)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the is_active filter", () => {
    expect(inputSchema.safeParse({ is_active: true }).success).toBe(true);
  });

  it("rejects per_page below the minimum", () => {
    expect(inputSchema.safeParse({ per_page: 0 }).success).toBe(false);
  });
});

describe("listTasks: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listTasks: run", () => {
  it("GETs /v2/tasks with the default per_page=20 when omitted", async () => {
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
      "https://api.harvestapp.com/v2/tasks?per_page=20",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.tasks).toHaveLength(1);
  });

  it("carries the is_active filter and an overriding per_page in the query", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    await definition.run(
      { is_active: false, per_page: 50 },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]?.url as string);
    expect(url.searchParams.get("is_active")).toBe("false");
    expect(url.searchParams.get("per_page")).toBe("50");
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
