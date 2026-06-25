import { describe, expect, it } from "vitest";

import deleteMessageDefinition from "../scripts/deleteMessage.ts";

const { outputSchema } = deleteMessageDefinition;

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

// A 204 No Content response: ok, empty body, and a json() that blows up so the
// test fails loudly if run() ever tries to parse the (nonexistent) body.
function noContentResponse(): Response {
  return {
    ok: true,
    status: 204,
    statusText: "No Content",
    headers: new Headers(),
    text: async () => "",
    json: async () => {
      throw new Error("run() must not call res.json() on a 204 delete");
    },
  } as unknown as Response;
}

describe("deleteMessage: run", () => {
  it("DELETEs /me/messages/{id} and synthesizes { success: true } without reading the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return noContentResponse();
    }) as typeof globalThis.fetch;

    const { data } = await deleteMessageDefinition.run(
      { messageId: "AAMkMsg==" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/AAMkMsg%3D%3D",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    // run() returns the synthesized object (json() throws if it were called).
    expect(data).toEqual({ success: true });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("routes to /users/{upn}/messages/{id} when a shared mailbox is supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return noContentResponse();
    }) as typeof globalThis.fetch;

    const { data } = await deleteMessageDefinition.run(
      { messageId: "AAMkMsg==", mailbox: "team@contoso.com" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/users/team%40contoso.com/messages/AAMkMsg%3D%3D",
    );
    expect(data).toEqual({ success: true });
  });

  it("throws a tool-named Error on a 404 Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await deleteMessageDefinition
      .run({ messageId: "AAMkMsg==" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Microsoft Outlook deleteMessage");
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
