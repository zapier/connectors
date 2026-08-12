import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/listTimeEntries.ts";

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

// A valid instance of the outputSchema (list envelope + one entry).
const listBody = {
  page: 1,
  total_pages: 1,
  total_entries: 1,
  next_page: null,
  previous_page: null,
  links: {
    first: "https://api.harvestapp.com/v2/time_entries?page=1&per_page=20",
    next: null,
    previous: null,
    last: "https://api.harvestapp.com/v2/time_entries?page=1&per_page=20",
  },
  time_entries: [
    {
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
    },
  ],
};

describe("listTimeEntries: inputSchema", () => {
  it("accepts an empty input (lists everything)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the documented filters", () => {
    expect(
      inputSchema.safeParse({
        user_id: 1782959,
        is_running: true,
        approval_status: "approved",
        from: "2017-03-01",
        to: "2017-03-31",
        per_page: 100,
      }).success,
    ).toBe(true);
  });

  it("rejects a bad approval_status enum value", () => {
    expect(inputSchema.safeParse({ approval_status: "pending" }).success).toBe(
      false,
    );
  });

  it("rejects per_page above the 2000 ceiling", () => {
    expect(inputSchema.safeParse({ per_page: 3000 }).success).toBe(false);
  });
});

describe("listTimeEntries: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listTimeEntries: run", () => {
  it("GETs /v2/time_entries with the default per_page=20 when omitted", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(listBody);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run({}, { fetch: fakeFetch });

    expect(calls[0]?.init?.method).toBe("GET");
    const url = new URL(calls[0]?.url as string);
    expect(url.origin + url.pathname).toBe(
      "https://api.harvestapp.com/v2/time_entries",
    );
    expect(url.searchParams.get("per_page")).toBe("20");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.time_entries).toHaveLength(1);
  });

  it("lands filters in the query string and lets a passed per_page override the default", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(listBody);
    }) as typeof globalThis.fetch;

    await definition.run(
      {
        user_id: 1782959,
        client_id: 5735774,
        project_id: 14307913,
        is_running: true,
        is_billed: false,
        approval_status: "submitted",
        from: "2017-03-01",
        to: "2017-03-31",
        updated_since: "2017-03-01T00:00:00Z",
        page: 2,
        per_page: 100,
      },
      { fetch: fakeFetch },
    );

    const params = new URL(calls[0]?.url as string).searchParams;
    expect(params.get("user_id")).toBe("1782959");
    expect(params.get("client_id")).toBe("5735774");
    expect(params.get("project_id")).toBe("14307913");
    expect(params.get("is_running")).toBe("true");
    expect(params.get("is_billed")).toBe("false");
    expect(params.get("approval_status")).toBe("submitted");
    expect(params.get("from")).toBe("2017-03-01");
    expect(params.get("to")).toBe("2017-03-31");
    expect(params.get("updated_since")).toBe("2017-03-01T00:00:00Z");
    expect(params.get("page")).toBe("2");
    // Passed per_page overrides the default 20.
    expect(params.get("per_page")).toBe("100");
  });

  it("omits unset filters from the query string", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(listBody);
    }) as typeof globalThis.fetch;

    await definition.run({ user_id: 1782959 }, { fetch: fakeFetch });

    const params = new URL(calls[0]?.url as string).searchParams;
    expect(params.has("client_id")).toBe(false);
    expect(params.has("is_running")).toBe(false);
    expect(params.has("page")).toBe(false);
    // per_page is always present (defaulted).
    expect(params.get("per_page")).toBe("20");
  });

  it("sets the User-Agent header", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(listBody);
    }) as typeof globalThis.fetch;

    await definition.run({}, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
  });

  it("throws a ConnectorHttpError carrying status + body on non-2xx", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "The access token is invalid" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
