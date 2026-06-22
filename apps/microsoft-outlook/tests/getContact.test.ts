import { describe, expect, it } from "vitest";

import getContactDefinition from "../scripts/getContact.ts";

const { outputSchema } = getContactDefinition;

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

describe("getContact: run", () => {
  it("GETs /me/contacts/{contactId} and returns the parsed contact", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "AAMk-1",
        displayName: "Jane Doe",
        givenName: "Jane",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getContactDefinition.run(
      { contactId: "AAMk-1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/contacts/AAMk-1",
    );
    expect(calls[0]?.init?.method).toBeUndefined();
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("AAMk-1");
  });

  it("URL-encodes a contactId containing reserved characters", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ id: "id/with+chars" });
    }) as typeof globalThis.fetch;

    await getContactDefinition.run(
      { contactId: "id/with+chars" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      `https://graph.microsoft.com/v1.0/me/contacts/${encodeURIComponent(
        "id/with+chars",
      )}`,
    );
  });

  it("throws on a 404 ErrorItemNotFound response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "Not found." } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getContactDefinition
      .run({ contactId: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
