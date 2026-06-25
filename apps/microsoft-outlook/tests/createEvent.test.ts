import { describe, expect, it } from "vitest";

import createEventDefinition from "../scripts/createEvent.ts";

const { outputSchema } = createEventDefinition;

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

const fullEvent = {
  id: "EV1",
  subject: "Standup",
  start: { dateTime: "2026-07-01T15:30:00", timeZone: "Pacific Standard Time" },
  end: { dateTime: "2026-07-01T16:00:00", timeZone: "Pacific Standard Time" },
};

describe("createEvent: run", () => {
  it("POSTs to /me/events with the event body and returns the parsed event", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(fullEvent);
    }) as typeof globalThis.fetch;

    const { data } = await createEventDefinition.run(
      {
        subject: "Standup",
        start: {
          dateTime: "2026-07-01T15:30:00",
          timeZone: "Pacific Standard Time",
        },
        end: {
          dateTime: "2026-07-01T16:00:00",
          timeZone: "Pacific Standard Time",
        },
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://graph.microsoft.com/v1.0/me/events");
    expect(calls[0]?.init?.method).toBe("POST");
    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect(sentBody).toMatchObject({
      subject: "Standup",
      start: {
        dateTime: "2026-07-01T15:30:00",
        timeZone: "Pacific Standard Time",
      },
      end: {
        dateTime: "2026-07-01T16:00:00",
        timeZone: "Pacific Standard Time",
      },
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("strips mailbox and calendarId from the request body (they only route the URL)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(fullEvent);
    }) as typeof globalThis.fetch;

    await createEventDefinition.run(
      {
        subject: "Standup",
        start: {
          dateTime: "2026-07-01T15:30:00",
          timeZone: "Pacific Standard Time",
        },
        end: {
          dateTime: "2026-07-01T16:00:00",
          timeZone: "Pacific Standard Time",
        },
        mailbox: "team@contoso.com",
        calendarId: "AAA",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/users/team%40contoso.com/calendars/AAA/events",
    );
    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect("mailbox" in sentBody).toBe(false);
    expect("calendarId" in sentBody).toBe(false);
  });

  it("throws a tool-named Error on a 404 Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await createEventDefinition
      .run(
        {
          subject: "Standup",
          start: {
            dateTime: "2026-07-01T15:30:00",
            timeZone: "Pacific Standard Time",
          },
          end: {
            dateTime: "2026-07-01T16:00:00",
            timeZone: "Pacific Standard Time",
          },
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Microsoft Outlook createEvent");
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
