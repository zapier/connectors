import { describe, expect, it } from "vitest";

import listEventsDefinition from "../scripts/listEvents.ts";

const { outputSchema } = listEventsDefinition;

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

describe("listEvents: run", () => {
  it("GETs /me/events with $top=20 when no calendarId is supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [{ id: "EV1", subject: "Standup" }],
      });
    }) as typeof globalThis.fetch;

    const { data } = await listEventsDefinition.run({}, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/events?%24top=20",
    );
    expect(calls[0]?.init?.method).toBeUndefined();
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(1);
  });

  it("switches to the /me/calendars/{id}/events path when calendarId is supplied", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [{ id: "EV1", subject: "Standup" }] });
    }) as typeof globalThis.fetch;

    await listEventsDefinition.run({ calendarId: "AAA" }, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/calendars/AAA/events?%24top=20",
    );
  });

  it("throws a tool-named Error on a 404 Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listEventsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Microsoft Outlook listEvents");
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });

  it("strips the null seriesMasterId Graph returns for non-recurring events", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        value: [{ id: "EV1", subject: "Standup", seriesMasterId: null }],
      })) as typeof globalThis.fetch;

    const { data } = await listEventsDefinition.run({}, { fetch: fakeFetch });

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items[0]?.seriesMasterId).toBeUndefined();
  });
});
