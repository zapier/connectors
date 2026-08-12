import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/getCompany.ts";

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
  name: "API Examples",
  is_active: true,
  week_start_day: "Monday",
  wants_timestamp_timers: false,
  time_format: "hours_minutes",
  date_format: "%m/%d/%Y",
  plan_type: "sponsored",
  clock: "12h",
  weekly_capacity: 126000,
  expense_feature: true,
  invoice_feature: true,
  estimate_feature: true,
  approval_feature: false,
};

describe("getCompany: inputSchema", () => {
  it("accepts an empty object (no input)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("rejects any extra key (strict)", () => {
    expect(inputSchema.safeParse({ name: "x" }).success).toBe(false);
  });
});

describe("getCompany: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getCompany: run", () => {
  it("GETs /v2/company and returns wants_timestamp_timers", async () => {
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
    expect(calls[0]?.url).toBe("https://api.harvestapp.com/v2/company");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.wants_timestamp_timers).toBe(false);
    expect(typeof result.wants_timestamp_timers).toBe("boolean");
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
