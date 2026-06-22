import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createEventDefinition from "../scripts/createEvent.ts";

const { inputSchema, outputSchema } = createEventDefinition;

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

describe("createEvent: run", () => {
  it("POSTs to /calendars/primary/events with sendUpdates=all and a start/end body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "evt_1", status: "confirmed" });
    }) as typeof globalThis.fetch;

    const { data: result } = await createEventDefinition.run(
      {
        calendarId: "primary",
        start: { dateTime: "2026-06-16T09:00:00-07:00" },
        end: { dateTime: "2026-06-16T10:00:00-07:00" },
        summary: "Sync",
        sendUpdates: "all",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/calendar/v3/calendars/primary/events");
    expect(url.searchParams.get("sendUpdates")).toBe("all");
    expect(calls[0]?.init?.method).toBe("POST");

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.start).toEqual({ dateTime: "2026-06-16T09:00:00-07:00" });
    expect(body.end).toEqual({ dateTime: "2026-06-16T10:00:00-07:00" });
    expect(body.summary).toBe("Sync");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("evt_1");
  });

  it("attaches a Google Meet createRequest and conferenceDataVersion=1 when add_google_meet is true", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "evt_1", status: "confirmed" });
    }) as typeof globalThis.fetch;

    await createEventDefinition.run(
      {
        calendarId: "primary",
        start: { dateTime: "2026-06-16T09:00:00-07:00" },
        end: { dateTime: "2026-06-16T10:00:00-07:00" },
        add_google_meet: true,
        sendUpdates: "all",
      },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("conferenceDataVersion")).toBe("1");

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(typeof body.conferenceData.createRequest.requestId).toBe("string");
    expect(body.conferenceData.createRequest.conferenceSolutionKey.type).toBe(
      "hangoutsMeet",
    );

    // The synthetic/routing fields must never leak into the JSON body.
    expect(body).not.toHaveProperty("calendarId");
    expect(body).not.toHaveProperty("sendUpdates");
    expect(body).not.toHaveProperty("add_google_meet");
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "forbidden",
            errors: [{ reason: "forbidden" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createEventDefinition
      .run(
        {
          calendarId: "primary",
          start: { dateTime: "2026-06-16T09:00:00-07:00" },
          end: { dateTime: "2026-06-16T10:00:00-07:00" },
          sendUpdates: "all",
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(403);
  });

  it("defaults sendUpdates to all", () => {
    const parsed = inputSchema.parse({
      calendarId: "primary",
      start: { dateTime: "2026-06-16T09:00:00-07:00" },
      end: { dateTime: "2026-06-16T10:00:00-07:00" },
    });
    expect(parsed.sendUpdates).toBe("all");
  });
});
