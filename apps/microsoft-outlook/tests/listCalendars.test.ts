import { describe, expect, it } from "vitest";

import listCalendarsDefinition from "../scripts/listCalendars.ts";

const { outputSchema } = listCalendarsDefinition;

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

describe("listCalendars: run", () => {
  it("GETs /me/calendars with $top=20 and unwraps the list envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [
          {
            id: "AAA=",
            name: "Calendar",
            isDefaultCalendar: true,
            canEdit: true,
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await listCalendarsDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/calendars?%24top=20",
    );
    expect(calls[0]?.init?.method).toBeUndefined();
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.id).toBe("AAA=");
  });

  it("fetches the opaque next_cursor URL verbatim when a cursor is supplied", async () => {
    const cursor =
      "https://graph.microsoft.com/v1.0/me/calendars?%24top=20&%24skip=20";
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await listCalendarsDefinition.run({ cursor }, { fetch: fakeFetch });

    expect(calls[0]?.url).toBe(cursor);
  });

  it("throws a tool-named Error on a 404 Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listCalendarsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Microsoft Outlook listCalendars");
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
