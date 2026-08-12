import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/createTimeEntryForTimestamps.ts";

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

// A valid instance of the outputSchema for a timestamps-mode entry.
const entryBody = {
  id: 636709355,
  spent_date: "2017-03-02",
  user: { id: 1782959, name: "Kim Allen" },
  client: { id: 5735774, name: "ABC Corp" },
  project: { id: 14307913, name: "Marketing Website" },
  task: { id: 8083365, name: "Graphic Design" },
  hours: 1,
  rounded_hours: 1,
  notes: null,
  is_running: false,
  timer_started_at: null,
  started_time: "8:00am",
  ended_time: "9:00am",
  billable: true,
  is_billed: false,
  is_locked: false,
  locked_reason: null,
  approval_status: "unsubmitted",
  created_at: "2017-06-27T16:01:23Z",
  updated_at: "2017-06-27T16:01:23Z",
};

// Running-timer variant: ended_time omitted, is_running true.
const runningEntryBody = {
  ...entryBody,
  hours: 0,
  is_running: true,
  timer_started_at: "2017-06-27T16:01:23Z",
  started_time: "8:00am",
  ended_time: null,
};

describe("createTimeEntryForTimestamps: inputSchema", () => {
  it("accepts a minimal entry with start/end times", () => {
    expect(
      inputSchema.safeParse({
        project_id: 14307913,
        task_id: 8083365,
        spent_date: "2017-03-01",
        started_time: "8:00am",
        ended_time: "9:00am",
      }).success,
    ).toBe(true);
  });

  it("accepts omitting ended_time (running-timer path)", () => {
    expect(
      inputSchema.safeParse({
        project_id: 14307913,
        task_id: 8083365,
        spent_date: "2017-03-01",
        started_time: "8:00am",
      }).success,
    ).toBe(true);
  });

  it("rejects a missing required field (spent_date)", () => {
    expect(
      inputSchema.safeParse({
        project_id: 14307913,
        task_id: 8083365,
        started_time: "8:00am",
      }).success,
    ).toBe(false);
  });
});

describe("createTimeEntryForTimestamps: run", () => {
  it("POSTs to /v2/time_entries with started_time/ended_time and NOT hours", async () => {
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
        started_time: "8:00am",
        ended_time: "9:00am",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.harvestapp.com/v2/time_entries");
    expect(calls[0]?.init?.method).toBe("POST");
    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect(sentBody).toMatchObject({
      project_id: 14307913,
      task_id: 8083365,
      spent_date: "2017-03-01",
      started_time: "8:00am",
      ended_time: "9:00am",
    });
    expect("hours" in sentBody).toBe(false);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("omits ended_time from the body when not provided (running-timer path)", async () => {
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
        started_time: "8:00am",
      },
      { fetch: fakeFetch },
    );

    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect(sentBody).toMatchObject({ started_time: "8:00am" });
    expect("ended_time" in sentBody).toBe(false);
    expect("hours" in sentBody).toBe(false);
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.is_running).toBe(true);
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
        started_time: "8:00am",
        ended_time: "9:00am",
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
        { message: "This account tracks time by duration" },
        { status: 422 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run(
        {
          project_id: 14307913,
          task_id: 8083365,
          spent_date: "2017-03-01",
          started_time: "8:00am",
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(422);
  });
});
