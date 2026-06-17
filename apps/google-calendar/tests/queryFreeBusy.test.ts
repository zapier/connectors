import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import queryFreeBusyDefinition from "../scripts/queryFreeBusy.ts";

const { inputSchema, outputSchema } = queryFreeBusyDefinition;

function jsonResponse(
  body: unknown,
  init: { status?: number; ok?: boolean } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

const window = {
  timeMin: "2026-06-16T00:00:00Z",
  timeMax: "2026-06-17T00:00:00Z",
};

describe("queryFreeBusy: run", () => {
  it("maps calendar_ids into the wire items shape and surfaces per-calendar busy blocks", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        calendars: {
          primary: {
            busy: [
              { start: "2026-06-16T09:00:00Z", end: "2026-06-16T10:00:00Z" },
            ],
          },
        },
      });
    }) as typeof globalThis.fetch;

    const { data } = await queryFreeBusyDefinition.run(
      { ...window, calendar_ids: ["primary", "team@example.com"] },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://www.googleapis.com/calendar/v3/freeBusy",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      timeMin: window.timeMin,
      timeMax: window.timeMax,
      items: [{ id: "primary" }, { id: "team@example.com" }],
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.calendars.primary?.busy[0]?.start).toBe("2026-06-16T09:00:00Z");
  });

  it("maps calendar_ids: ['primary'] to items: [{ id: 'primary' }] in the body", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ calendars: { primary: { busy: [] } } });
    }) as typeof globalThis.fetch;

    await queryFreeBusyDefinition.run(
      { ...window, calendar_ids: ["primary"] },
      { fetch: fakeFetch },
    );

    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      timeMin: window.timeMin,
      timeMax: window.timeMax,
      items: [{ id: "primary" }],
    });
  });

  it("defaults calendar_ids to ['primary'] when omitted", () => {
    expect(
      inputSchema.parse({
        timeMin: window.timeMin,
        timeMax: window.timeMax,
      }).calendar_ids,
    ).toEqual(["primary"]);
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 400, message: "Bad Request" } },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await queryFreeBusyDefinition
      .run({ ...window, calendar_ids: ["primary"] }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(400);
  });
});
