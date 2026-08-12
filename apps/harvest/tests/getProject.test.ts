import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/getProject.ts";

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

// A valid instance of getProject's outputSchema.
const cannedProject = {
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
};

describe("getProject: inputSchema", () => {
  it("accepts a valid id", () => {
    expect(inputSchema.safeParse({ id: 14308069 }).success).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: 1.5 }).success).toBe(false);
  });
});

describe("getProject: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getProject: run", () => {
  it("GETs /v2/projects/:id and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(cannedProject);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { id: 14308069 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.harvestapp.com/v2/projects/14308069",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(14308069);
    expect(result.client?.name).toBe("123 Industries");
  });

  it("sets the User-Agent header", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(cannedProject);
    }) as typeof globalThis.fetch;

    await definition.run({ id: 14308069 }, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
  });

  it("throws a ConnectorHttpError carrying status + body on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Project not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({ id: 999999 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(404);
    expect(httpErr.response.body).toMatchObject({
      message: "Project not found",
    });
  });
});
