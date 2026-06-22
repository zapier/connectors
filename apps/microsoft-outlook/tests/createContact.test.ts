import { describe, expect, it } from "vitest";

import createContactDefinition from "../scripts/createContact.ts";

const { outputSchema } = createContactDefinition;

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

describe("createContact: run", () => {
  it("POSTs the contact fields to /me/contacts and returns the parsed contact", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "AAMk-new",
        givenName: "Jane",
        surname: "Doe",
      });
    }) as typeof globalThis.fetch;

    const input = { givenName: "Jane", surname: "Doe" };
    const { data } = await createContactDefinition.run(input, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://graph.microsoft.com/v1.0/me/contacts");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual(input);
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("AAMk-new");
  });

  it("sets Content-Type: application/json for the JSON body", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ id: "AAMk-new" });
    }) as typeof globalThis.fetch;

    await createContactDefinition.run(
      { displayName: "Jane Doe" },
      { fetch: fakeFetch },
    );

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws on a 404 ErrorItemNotFound response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "Not found." } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await createContactDefinition
      .run({ givenName: "Jane" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
