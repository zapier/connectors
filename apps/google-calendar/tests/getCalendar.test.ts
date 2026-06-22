import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getCalendarDefinition from "../scripts/getCalendar.ts";

const { outputSchema } = getCalendarDefinition;

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

describe("getCalendar: run", () => {
  it("GETs /calendars/{calendarId} and returns the calendar", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "primary",
        timeZone: "America/Los_Angeles",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getCalendarDefinition.run(
      { calendarId: "primary" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("primary");
    expect(data.timeZone).toBe("America/Los_Angeles");
  });

  it("URL-encodes a calendarId containing reserved characters", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ id: "team@example.com" });
    }) as typeof globalThis.fetch;

    await getCalendarDefinition.run(
      { calendarId: "team@example.com" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/team%40example.com",
    );
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 404,
            message: "Not Found",
            errors: [{ reason: "notFound" }],
          },
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getCalendarDefinition
      .run({ calendarId: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);
    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(404);
  });
});
