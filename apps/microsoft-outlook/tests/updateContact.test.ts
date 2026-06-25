import { describe, expect, it } from "vitest";

import updateContactDefinition from "../scripts/updateContact.ts";

const { outputSchema } = updateContactDefinition;

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

describe("updateContact: run", () => {
  it("PATCHes /me/contacts/{contactId} with only the patched fields (no contactId in body)", async () => {
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
        mobilePhone: "555",
      });
    }) as typeof globalThis.fetch;

    const { data } = await updateContactDefinition.run(
      { contactId: "AAMk-1", mobilePhone: "555" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/contacts/AAMk-1",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    // contactId is the path param — it must NOT leak into the patch body.
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ mobilePhone: "555" });
    expect(body.contactId).toBeUndefined();
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("AAMk-1");
  });

  it("sends an empty body when only the contactId is supplied", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ id: "AAMk-1" });
    }) as typeof globalThis.fetch;

    await updateContactDefinition.run(
      { contactId: "AAMk-1" },
      { fetch: fakeFetch },
    );

    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({});
  });

  it("throws on a 404 ErrorItemNotFound response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "Not found." } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await updateContactDefinition
      .run({ contactId: "missing", mobilePhone: "555" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
