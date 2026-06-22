import { describe, expect, it } from "vitest";

import listContactsDefinition from "../scripts/listContacts.ts";

const { outputSchema } = listContactsDefinition;

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

describe("listContacts: run", () => {
  it("GETs /me/contacts with the default $top and unwraps the Graph envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [
          {
            id: "AAMk-1",
            displayName: "Jane Doe",
            emailAddresses: [{ address: "x@y.com" }],
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await listContactsDefinition.run({}, { fetch: fakeFetch });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/contacts?%24top=20",
    );
    // GET is the default (no explicit method on the read path).
    expect(calls[0]?.init?.method).toBeUndefined();
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.id).toBe("AAMk-1");
    expect(data.next_cursor).toBeUndefined();
  });

  it("encodes an email $filter into the query string", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await listContactsDefinition.run(
      { filter: "emailAddresses/any(a:a/address eq 'x@y.com')" },
      { fetch: fakeFetch },
    );

    // URLSearchParams percent-encodes the $filter value (spaces become "+").
    expect(calls[0]?.url).toContain("%24filter=");
    expect(calls[0]?.url).toContain("emailAddresses%2Fany");
    expect(calls[0]?.url).toContain("x%40y.com");
  });

  it("fetches an opaque nextLink cursor verbatim and surfaces a new next_cursor", async () => {
    const cursor =
      "https://graph.microsoft.com/v1.0/me/contacts?%24skiptoken=ABC123";
    const next =
      "https://graph.microsoft.com/v1.0/me/contacts?%24skiptoken=DEF456";
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({
        value: [{ id: "AAMk-2" }],
        "@odata.nextLink": next,
      });
    }) as typeof globalThis.fetch;

    const { data } = await listContactsDefinition.run(
      { cursor },
      { fetch: fakeFetch },
    );

    // Cursor is fetched verbatim — no path/query rebuild.
    expect(calls[0]?.url).toBe(cursor);
    expect(data.next_cursor).toBe(next);
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws on a 404 ErrorItemNotFound response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "Not found." } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listContactsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
