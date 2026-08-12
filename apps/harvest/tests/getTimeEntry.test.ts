import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/getTimeEntry.ts";

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

const entryBody = {
  id: 636709355,
  spent_date: "2017-03-02",
  user: { id: 1782959, name: "Kim Allen" },
  client: { id: 5735774, name: "ABC Corp" },
  project: { id: 14307913, name: "Marketing Website" },
  task: { id: 8083365, name: "Graphic Design" },
  hours: 2.11,
  rounded_hours: 2.25,
  notes: null,
  is_running: false,
  timer_started_at: null,
  started_time: null,
  ended_time: null,
  billable: true,
  is_billed: false,
  is_locked: false,
  locked_reason: null,
  approval_status: "unsubmitted",
  created_at: "2017-06-27T16:01:23Z",
  updated_at: "2017-06-27T16:01:23Z",
};

describe("getTimeEntry: inputSchema", () => {
  it("accepts an id", () => {
    expect(inputSchema.safeParse({ id: 636709355 }).success).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-integer id", () => {
    expect(inputSchema.safeParse({ id: 1.5 }).success).toBe(false);
  });
});

describe("getTimeEntry: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getTimeEntry: run", () => {
  it("GETs /v2/time_entries/{id} and returns the parsed entry", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(entryBody);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { id: 636709355 },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.harvestapp.com/v2/time_entries/636709355",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(636709355);
  });

  it("sets the User-Agent header", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(entryBody);
    }) as typeof globalThis.fetch;

    await definition.run({ id: 636709355 }, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
  });

  it("throws a ConnectorHttpError carrying status + body on non-2xx", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({ id: 636709355 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
