import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/listProjects.ts";

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

// A valid instance of listProjects's outputSchema.
const cannedList = {
  page: 1,
  total_pages: 1,
  total_entries: 1,
  next_page: null,
  previous_page: null,
  links: {
    first: "https://api.harvestapp.com/v2/projects?page=1&per_page=20",
    next: null,
    previous: null,
    last: "https://api.harvestapp.com/v2/projects?page=1&per_page=20",
  },
  projects: [
    {
      id: 14308069,
      name: "Online Store - Phase 1",
      code: "OS1",
      is_active: true,
      is_billable: true,
      is_fixed_fee: false,
      bill_by: "Project",
      budget_by: "project",
      budget: 200,
      cost_budget: null,
      hourly_rate: 100,
      fee: null,
      notes: null,
      starts_on: "2017-06-01",
      ends_on: null,
      client: { id: 5735776, name: "123 Industries", currency: "EUR" },
      created_at: "2017-06-26T21:52:18Z",
      updated_at: "2017-06-26T21:54:06Z",
    },
  ],
};

describe("listProjects: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the documented filters", () => {
    expect(
      inputSchema.safeParse({ client_id: 5735776, is_active: true }).success,
    ).toBe(true);
  });

  it("rejects per_page above the maximum", () => {
    expect(inputSchema.safeParse({ per_page: 2001 }).success).toBe(false);
  });
});

describe("listProjects: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listProjects: run", () => {
  it("GETs /v2/projects, applies the default per_page, and returns the parsed body", async () => {
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
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/v2/projects");
    // per_page defaults to 20 in run() when omitted.
    expect(url.searchParams.get("per_page")).toBe("20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.projects).toHaveLength(1);
  });

  it("passes filters and an explicit per_page into the query string", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      _init?: RequestInit,
    ) => {
      calls.push({ url });
      return jsonResponse(cannedList);
    }) as typeof globalThis.fetch;

    await definition.run(
      { client_id: 5735776, is_active: true, per_page: 100 },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("client_id")).toBe("5735776");
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
      return jsonResponse(cannedList);
    }) as typeof globalThis.fetch;

    await definition.run({}, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
  });

  it("throws a ConnectorHttpError carrying status + body on 401", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Authentication failed" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(401);
  });
});
