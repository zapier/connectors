import { describe, expect, it } from "vitest";

import deleteContactDefinition from "../scripts/deleteContact.ts";

const { outputSchema } = deleteContactDefinition;

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

describe("deleteContact: run", () => {
  it("DELETEs /me/contacts/{contactId} and synthesizes a success result on 204", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      // Graph returns 204 with no body.
      return jsonResponse(null, { status: 204 });
    }) as typeof globalThis.fetch;

    const { data } = await deleteContactDefinition.run(
      { contactId: "AAMk-1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/contacts/AAMk-1",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(data).toEqual({ success: true });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("does not read or echo any response body (204 has none)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () => {
      // json() would throw if called — proving run() never touches the body.
      return {
        ok: true,
        status: 204,
        statusText: "No Content",
        headers: new Headers(),
        text: async () => "",
        json: async () => {
          throw new Error("body should not be read on delete");
        },
      } as unknown as Response;
    }) as typeof globalThis.fetch;

    const { data } = await deleteContactDefinition.run(
      { contactId: "AAMk-1" },
      { fetch: fakeFetch },
    );

    expect(data).toEqual({ success: true });
  });

  it("throws on a 404 ErrorItemNotFound response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "Not found." } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await deleteContactDefinition
      .run({ contactId: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
