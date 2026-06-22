import { describe, expect, it } from "vitest";

import updateEventDefinition from "../scripts/updateEvent.ts";

const { outputSchema } = updateEventDefinition;

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
  subject: "New",
  start: { dateTime: "2026-07-01T15:30:00", timeZone: "Pacific Standard Time" },
  end: { dateTime: "2026-07-01T16:00:00", timeZone: "Pacific Standard Time" },
};

describe("updateEvent: run", () => {
  it("PATCHes /me/events/{eventId} with only the patched fields and returns the parsed event", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(fullEvent);
    }) as typeof globalThis.fetch;

    const { data } = await updateEventDefinition.run(
      { eventId: "EV1", subject: "New" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/events/EV1",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect(sentBody).toEqual({ subject: "New" });
    expect("eventId" in sentBody).toBe(false);
    expect("mailbox" in sentBody).toBe(false);
    expect("calendarId" in sentBody).toBe(false);
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("strips routing keys from the body even when mailbox and calendarId are supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(fullEvent);
    }) as typeof globalThis.fetch;

    await updateEventDefinition.run(
      {
        eventId: "EV1",
        subject: "New",
        mailbox: "team@contoso.com",
        calendarId: "AAA",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/users/team%40contoso.com/calendars/AAA/events/EV1",
    );
    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect(sentBody).toEqual({ subject: "New" });
  });

  it("throws a tool-named Error on a 404 Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await updateEventDefinition
      .run({ eventId: "EV1", subject: "New" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Microsoft Outlook updateEvent");
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
