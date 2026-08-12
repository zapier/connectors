import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/createTask.ts";

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

describe("createTask: inputSchema", () => {
  it("accepts a minimal input (name only)", () => {
    expect(inputSchema.safeParse({ name: "Programming" }).success).toBe(true);
  });

  it("rejects a missing required name", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    expect(
      inputSchema.safeParse({ name: "x", not_a_field: true }).success,
    ).toBe(false);
  });

  it("accepts the full documented shape", () => {
    expect(
      inputSchema.safeParse({
        name: "Design",
        billable_by_default: true,
        default_hourly_rate: 150,
        is_default: false,
      }).success,
    ).toBe(true);
  });
});

describe("createTask: governance", () => {
  it("is not read-only and not destructive", () => {
    expect(definition.annotations?.readOnlyHint).toBe(false);
    expect(definition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createTask: run", () => {
  it("POSTs to /v2/tasks with only the provided fields in the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: 8083800,
        name: "Design",
        billable_by_default: true,
        default_hourly_rate: 150,
        is_default: false,
        is_active: true,
        created_at: "2021-01-01T00:00:00Z",
        updated_at: "2021-01-01T00:00:00Z",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { name: "Design", billable_by_default: true },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.harvestapp.com/v2/tasks");
    expect(calls[0]?.init?.method).toBe("POST");
    // Only provided fields land in the body — omitted optionals are absent.
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ name: "Design", billable_by_default: true });
    expect(body).not.toHaveProperty("default_hourly_rate");
    expect(body).not.toHaveProperty("is_default");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(8083800);
  });

  it("sets the User-Agent and Content-Type headers", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ id: 1, name: "x", is_active: true });
    }) as typeof globalThis.fetch;

    await definition.run({ name: "x" }, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws a ConnectorHttpError carrying status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Name can't be blank" },
        { status: 422 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({ name: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(422);
    expect(httpErr.response.body).toMatchObject({
      message: "Name can't be blank",
    });
  });
});
