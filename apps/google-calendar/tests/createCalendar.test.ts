import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createCalendarDefinition from "../scripts/createCalendar.ts";

const { outputSchema } = createCalendarDefinition;

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

describe("createCalendar: run", () => {
  it("POSTs /calendars with the summary and returns the created calendar", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "new-cal-id", summary: "Team Calendar" });
    }) as typeof globalThis.fetch;

    const { data } = await createCalendarDefinition.run(
      { summary: "Team Calendar" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://www.googleapis.com/calendar/v3/calendars",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      summary: "Team Calendar",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("new-cal-id");
  });

  it("includes optional description, timeZone, and location in the body when passed", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ id: "new-cal-id", summary: "Team Calendar" });
    }) as typeof globalThis.fetch;

    await createCalendarDefinition.run(
      {
        summary: "Team Calendar",
        description: "Shared team events",
        timeZone: "America/Los_Angeles",
        location: "San Francisco",
      },
      { fetch: fakeFetch },
    );

    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      summary: "Team Calendar",
      description: "Shared team events",
      timeZone: "America/Los_Angeles",
      location: "San Francisco",
    });
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: 403, message: "Forbidden" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createCalendarDefinition
      .run({ summary: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(403);
  });
});
