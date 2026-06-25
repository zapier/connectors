import { describe, expect, it } from "vitest";

import getEventDefinition from "../scripts/getEvent.ts";

const { outputSchema } = getEventDefinition;

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

describe("getEvent: run", () => {
  it("GETs /me/events/{eventId} and returns the parsed event", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(fullEvent);
    }) as typeof globalThis.fetch;

    const { data } = await getEventDefinition.run(
      { eventId: "EV1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/events/EV1",
    );
    expect(calls[0]?.init?.method).toBeUndefined();
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("switches to the /me/calendars/{cid}/events/{eventId} path when calendarId is supplied", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(fullEvent);
    }) as typeof globalThis.fetch;

    await getEventDefinition.run(
      { eventId: "EV1", calendarId: "AAA" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/calendars/AAA/events/EV1",
    );
  });

  it("throws a tool-named Error on a 404 Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getEventDefinition
      .run({ eventId: "EV1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Microsoft Outlook getEvent");
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
