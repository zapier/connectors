import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/createProject.ts";

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

const minimalInput = {
  client_id: 5735776,
  name: "Online Store - Phase 1",
  is_billable: true,
  bill_by: "Project",
  budget_by: "project",
};

// Parsed variant for run() — inputSchema.parse narrows bill_by/budget_by from
// bare strings to the enum unions run()'s typed input expects.
const parsedInput = inputSchema.parse(minimalInput);

// A valid instance of createProject's outputSchema.
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

describe("createProject: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse(minimalInput).success).toBe(true);
  });

  it("rejects a missing required field (bill_by)", () => {
    const { bill_by: _omit, ...rest } = minimalInput;
    expect(inputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a missing required field (client_id)", () => {
    const { client_id: _omit, ...rest } = minimalInput;
    expect(inputSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a bad bill_by enum value", () => {
    expect(
      inputSchema.safeParse({ ...minimalInput, bill_by: "hourly" }).success,
    ).toBe(false);
  });

  it("rejects a bad budget_by enum value", () => {
    expect(
      inputSchema.safeParse({ ...minimalInput, budget_by: "Project" }).success,
    ).toBe(false);
  });
});

describe("createProject: governance", () => {
  it("is not read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("createProject: run", () => {
  it("POSTs to /v2/projects with only the provided fields and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(cannedProject);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(parsedInput, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.harvestapp.com/v2/projects");
    expect(calls[0]?.init?.method).toBe("POST");

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({
      client_id: 5735776,
      name: "Online Store - Phase 1",
      is_billable: true,
      bill_by: "Project",
      budget_by: "project",
    });
    // Omitted optionals must be absent from the body.
    expect(body).not.toHaveProperty("code");
    expect(body).not.toHaveProperty("hourly_rate");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(14308069);
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

    await definition.run(parsedInput, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws a ConnectorHttpError carrying status + body on 422", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Client can't be blank" },
        { status: 422 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run(parsedInput, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(422);
    expect(httpErr.response.body).toMatchObject({
      message: "Client can't be blank",
    });
  });
});
