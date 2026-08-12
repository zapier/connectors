import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/updateTimeEntry.ts";

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
  hours: 3,
  rounded_hours: 3,
  notes: "Updated notes",
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
  updated_at: "2017-06-27T16:02:40Z",
};

describe("updateTimeEntry: inputSchema", () => {
  it("accepts an id with a single changed field", () => {
    expect(inputSchema.safeParse({ id: 636709355, hours: 3 }).success).toBe(
      true,
    );
  });

  it("accepts just an id (no changes)", () => {
    expect(inputSchema.safeParse({ id: 636709355 }).success).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(inputSchema.safeParse({ hours: 3 }).success).toBe(false);
  });
});

describe("updateTimeEntry: governance", () => {
  it("is not read-only and not destructive", () => {
    expect(definition.annotations?.readOnlyHint).toBe(false);
    expect(definition.annotations?.destructiveHint).toBe(false);
  });
});

describe("updateTimeEntry: run", () => {
  it("PATCHes /v2/time_entries/{id} with only the provided fields", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(entryBody);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { id: 636709355, hours: 3, notes: "Updated notes" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.harvestapp.com/v2/time_entries/636709355",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect(sentBody).toEqual({ hours: 3, notes: "Updated notes" });
    // id is a path param, not a body field.
    expect("id" in sentBody).toBe(false);
    // Untouched fields are absent from the body.
    expect("project_id" in sentBody).toBe(false);
    expect("task_id" in sentBody).toBe(false);
    expect("spent_date" in sentBody).toBe(false);
    expect("started_time" in sentBody).toBe(false);
    expect("ended_time" in sentBody).toBe(false);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("sends an empty body when only the id is provided", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(entryBody);
    }) as typeof globalThis.fetch;

    await definition.run({ id: 636709355 }, { fetch: fakeFetch });

    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({});
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

    await definition.run({ id: 636709355, hours: 3 }, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws a ConnectorHttpError carrying status + body on non-2xx", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Can't update a locked time entry" },
        { status: 422 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({ id: 636709355, hours: 3 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(422);
  });
});
