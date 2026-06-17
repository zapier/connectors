import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import addEventAttendeesDefinition from "../scripts/addEventAttendees.ts";

const { inputSchema, outputSchema } = addEventAttendeesDefinition;

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

describe("addEventAttendees: run", () => {
  it("read-modify-writes: GET then PATCH, case-insensitive dedupe union, sendUpdates=all", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      if ((init?.method ?? "GET") === "GET") {
        // Call 1: existing event with one attendee carrying a responseStatus.
        return jsonResponse({
          id: "e1",
          status: "confirmed",
          attendees: [
            { email: "alice@example.com", responseStatus: "accepted" },
          ],
        });
      }
      // Call 2: PATCH echoes back an Event.
      return jsonResponse({ id: "e1", status: "confirmed" });
    }) as typeof globalThis.fetch;

    const { data: result } = await addEventAttendeesDefinition.run(
      {
        calendarId: "primary",
        eventId: "e1",
        attendees: ["Alice@example.com", "bob@example.com"],
        sendUpdates: "all",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(2);

    // Call 1 is the GET read.
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(calls[0]?.url).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/e1",
    );

    // Call 2 is the PATCH write with sendUpdates=all.
    expect(calls[1]?.init?.method).toBe("PATCH");
    expect(calls[1]?.url).toContain("sendUpdates=all");

    // The PATCH body unions new emails into the existing roster, deduping
    // case-insensitively: Alice@example.com matches the existing alice@example.com (preserved with
    // its responseStatus) and is NOT duplicated; bob@example.com is appended.
    const patchBody = JSON.parse(calls[1]?.init?.body as string) as {
      attendees: Array<{ email?: string; responseStatus?: string }>;
    };
    expect(patchBody.attendees).toHaveLength(2);
    expect(patchBody.attendees[0]).toEqual({
      email: "alice@example.com",
      responseStatus: "accepted",
    });
    expect(patchBody.attendees[1]).toEqual({ email: "bob@example.com" });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("e1");
  });

  it("throws a ConnectorHttpError when the initial GET is non-OK", async () => {
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

    const err = await addEventAttendeesDefinition
      .run(
        {
          calendarId: "primary",
          eventId: "missing",
          attendees: ["bob@example.com"],
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
      eventId: "e1",
      attendees: ["bob@example.com"],
    });
    expect(parsed.sendUpdates).toBe("all");
  });
});
