import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/createTimeEntry.ts";

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

// A valid instance of the createTimeEntry outputSchema (single time entry).
const entryBody = {
  id: 636709355,
  spent_date: "2017-03-02",
  user: { id: 1782959, name: "Kim Allen" },
  client: { id: 5735774, name: "ABC Corp" },
  project: { id: 14307913, name: "Marketing Website" },
  task: { id: 8083365, name: "Graphic Design" },
  hours: 2.11,
  rounded_hours: 2.25,
  notes: "Adding CSS",
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

// A valid instance for the running-timer path (hours 0, is_running true).
const runningEntryBody = {
  ...entryBody,
  hours: 0,
  is_running: true,
  timer_started_at: "2017-06-27T16:01:23Z",
};

describe("createTimeEntry: inputSchema", () => {
  it("accepts a minimal duration entry", () => {
    expect(
      inputSchema.safeParse({
        project_id: 14307913,
        task_id: 8083365,
        spent_date: "2017-03-01",
        hours: 1.5,
      }).success,
    ).toBe(true);
  });

  it("accepts omitting hours (running-timer path)", () => {
    expect(
      inputSchema.safeParse({
        project_id: 14307913,
        task_id: 8083365,
        spent_date: "2017-03-01",
      }).success,
    ).toBe(true);
  });

  it("rejects a missing required field (task_id)", () => {
    expect(
      inputSchema.safeParse({
        project_id: 14307913,
        spent_date: "2017-03-01",
        hours: 1.5,
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown key (strict object)", () => {
    expect(
      inputSchema.safeParse({
        project_id: 14307913,
        task_id: 8083365,
        spent_date: "2017-03-01",
        surprise: true,
      }).success,
    ).toBe(false);
  });
});

describe("createTimeEntry: governance", () => {
  it("is not read-only and not destructive", () => {
    expect(definition.annotations?.readOnlyHint).toBe(false);
    expect(definition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createTimeEntry: run", () => {
  it("POSTs to /v2/time_entries with hours in the body and returns the parsed entry", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(entryBody);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      {
        project_id: 14307913,
        task_id: 8083365,
        spent_date: "2017-03-01",
        hours: 1.5,
        notes: "Adding CSS",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.harvestapp.com/v2/time_entries");
    expect(calls[0]?.init?.method).toBe("POST");
    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect(sentBody).toMatchObject({
      project_id: 14307913,
      task_id: 8083365,
      spent_date: "2017-03-01",
      hours: 1.5,
      notes: "Adding CSS",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("omits hours from the body when not provided (running-timer path) and still sends a valid body", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(runningEntryBody);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      {
        project_id: 14307913,
        task_id: 8083365,
        spent_date: "2017-03-01",
      },
      { fetch: fakeFetch },
    );

    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect("hours" in sentBody).toBe(false);
    expect(sentBody).toMatchObject({
      project_id: 14307913,
      task_id: 8083365,
      spent_date: "2017-03-01",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.is_running).toBe(true);
  });

  it("omits unset optionals (user_id, notes, external_reference) from the body", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(entryBody);
    }) as typeof globalThis.fetch;

    await definition.run(
      {
        project_id: 14307913,
        task_id: 8083365,
        spent_date: "2017-03-01",
        hours: 1.5,
      },
      { fetch: fakeFetch },
    );

    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect("user_id" in sentBody).toBe(false);
    expect("notes" in sentBody).toBe(false);
    expect("external_reference" in sentBody).toBe(false);
  });

  it("sets the User-Agent and Content-Type headers", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(entryBody);
    }) as typeof globalThis.fetch;

    await definition.run(
      {
        project_id: 14307913,
        task_id: 8083365,
        spent_date: "2017-03-01",
        hours: 1.5,
      },
      { fetch: fakeFetch },
    );

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws a ConnectorHttpError carrying status + body on non-2xx", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Task is not assigned to project" },
        { status: 422 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run(
        {
          project_id: 14307913,
          task_id: 8083365,
          spent_date: "2017-03-01",
          hours: 1.5,
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(422);
    expect(httpErr.response.body).toMatchObject({
      message: "Task is not assigned to project",
    });
  });
});
