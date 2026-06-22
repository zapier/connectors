import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateEventDefinition from "../scripts/updateEvent.ts";

const { inputSchema, outputSchema } = updateEventDefinition;

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

describe("updateEvent: run", () => {
  it("PATCHes /calendars/{id}/events/{eventId} and returns the parsed event", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "evt_1", status: "confirmed" });
    }) as typeof globalThis.fetch;

    const { data: result } = await updateEventDefinition.run(
      {
        calendarId: "primary",
        eventId: "evt_1",
        summary: "Renamed",
        sendUpdates: "all",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/calendar/v3/calendars/primary/events/evt_1");
    expect(url.searchParams.get("sendUpdates")).toBe("all");
    expect(calls[0]?.init?.method).toBe("PATCH");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("evt_1");
  });

  it("only includes the provided fields in the PATCH body", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ id: "evt_1", status: "confirmed" });
    }) as typeof globalThis.fetch;

    await updateEventDefinition.run(
      {
        calendarId: "primary",
        eventId: "evt_1",
        summary: "Renamed",
        sendUpdates: "all",
      },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ summary: "Renamed" });
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

    await updateEventDefinition.run(
      {
        calendarId: "primary",
        eventId: "evt_1",
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
    expect(body).not.toHaveProperty("add_google_meet");
  });

  it("throws a ConnectorHttpError on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 404,
            message: "not found",
            errors: [{ reason: "notFound" }],
          },
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await updateEventDefinition
      .run(
        {
          calendarId: "primary",
          eventId: "missing",
          summary: "x",
          sendUpdates: "all",
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    const httpErr = err as ConnectorHttpError;
    expect(httpErr.response.status).toBe(404);
  });

  it("defaults sendUpdates to all", () => {
    const parsed = inputSchema.parse({
      calendarId: "primary",
      eventId: "evt_1",
      summary: "Renamed",
    });
    expect(parsed.sendUpdates).toBe("all");
  });
});
