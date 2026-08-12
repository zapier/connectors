import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/updateProject.ts";

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

// A valid instance of updateProject's outputSchema.
const cannedProject = {
  id: 14308069,
  name: "Online Store - Phase 2",
  code: null,
  is_active: false,
  is_billable: true,
  is_fixed_fee: false,
  bill_by: "Project",
  budget_by: "project",
  budget: 250,
  cost_budget: null,
  hourly_rate: 120,
  fee: null,
  notes: "Reactivate in Q3",
  starts_on: null,
  ends_on: null,
  client: { id: 5735776, name: "123 Industries", currency: "EUR" },
  created_at: "2017-06-26T21:52:18Z",
  updated_at: "2017-06-26T21:54:06Z",
};

describe("updateProject: inputSchema", () => {
  it("accepts an id-only input (nothing to change)", () => {
    expect(inputSchema.safeParse({ id: 14308069 }).success).toBe(true);
  });

  it("accepts a partial update", () => {
    expect(
      inputSchema.safeParse({
        id: 14308069,
        name: "New name",
        is_active: false,
      }).success,
    ).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(inputSchema.safeParse({ name: "New name" }).success).toBe(false);
  });

  it("rejects a bad bill_by enum value", () => {
    expect(inputSchema.safeParse({ id: 1, bill_by: "hourly" }).success).toBe(
      false,
    );
  });

  it("rejects a bad budget_by enum value", () => {
    expect(inputSchema.safeParse({ id: 1, budget_by: "Project" }).success).toBe(
      false,
    );
  });
});

describe("updateProject: governance", () => {
  it("is not read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("updateProject: run", () => {
  it("PATCHes /v2/projects/:id with only the provided fields", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(cannedProject);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { id: 14308069, name: "Online Store - Phase 2", is_active: false },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.harvestapp.com/v2/projects/14308069",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({
      name: "Online Store - Phase 2",
      is_active: false,
    });
    // id is a path param, not a body field.
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("bill_by");

    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("sets the User-Agent and Content-Type headers", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(cannedProject);
    }) as typeof globalThis.fetch;

    await definition.run({ id: 14308069, name: "x" }, { fetch: fakeFetch });

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
