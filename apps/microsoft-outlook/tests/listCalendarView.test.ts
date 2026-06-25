import { describe, expect, it } from "vitest";

import listCalendarViewDefinition from "../scripts/listCalendarView.ts";

const { outputSchema } = listCalendarViewDefinition;

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

describe("listCalendarView: run", () => {
  it("GETs /me/calendarView with literal startDateTime/endDateTime params (not $filter) and surfaces next_cursor", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [{ id: "EV1", subject: "Standup" }],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/me/calendarView?%24skiptoken=abc",
      });
    }) as typeof globalThis.fetch;

    const { data } = await listCalendarViewDefinition.run(
      {
        startDateTime: "2026-07-01T00:00:00",
        endDateTime: "2026-07-08T00:00:00",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = calls[0]?.url ?? "";
    expect(url).toContain("https://graph.microsoft.com/v1.0/me/calendarView?");
    expect(url).toContain("startDateTime=");
    expect(url).toContain("endDateTime=");
    expect(url).not.toContain("%24filter");
    expect(url).not.toContain("$filter");
    expect(calls[0]?.init?.method).toBeUndefined();
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.next_cursor).toBe(
      "https://graph.microsoft.com/v1.0/me/calendarView?%24skiptoken=abc",
    );
  });

  it("fetches the opaque cursor URL verbatim when a cursor is supplied", async () => {
    const cursor =
      "https://graph.microsoft.com/v1.0/me/calendarView?%24skiptoken=abc";
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await listCalendarViewDefinition.run(
      {
        startDateTime: "2026-07-01T00:00:00",
        endDateTime: "2026-07-08T00:00:00",
        cursor,
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(cursor);
  });

  it("throws a tool-named Error on a 404 Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listCalendarViewDefinition
      .run(
        {
          startDateTime: "2026-07-01T00:00:00",
          endDateTime: "2026-07-08T00:00:00",
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(
      "Microsoft Outlook listCalendarView",
    );
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
