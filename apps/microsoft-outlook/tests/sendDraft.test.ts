import { describe, expect, it } from "vitest";

import sendDraftDefinition from "../scripts/sendDraft.ts";

const { outputSchema } = sendDraftDefinition;

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

function noBodyResponse(status: number): Response {
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "Accepted" : "Error",
    headers: new Headers(),
    text: async () => "",
    json: async () => ({}),
  } as unknown as Response;
}

describe("sendDraft: run", () => {
  it("POSTs to /me/messages/{id}/send and returns { success: true } on a 202", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return noBodyResponse(202);
    }) as typeof globalThis.fetch;

    const { data } = await sendDraftDefinition.run(
      { messageId: "AAMkDraft==" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/AAMkDraft%3D%3D/send",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(data).toEqual({ success: true });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("routes to the shared-mailbox path when mailbox is supplied", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return noBodyResponse(202);
    }) as typeof globalThis.fetch;

    const { data } = await sendDraftDefinition.run(
      { messageId: "abc", mailbox: "team@contoso.com" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/users/team%40contoso.com/messages/abc/send",
    );
    expect(data).toEqual({ success: true });
  });

  it("throws a tool-named Error on a non-OK Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "draft gone" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await sendDraftDefinition
      .run({ messageId: "dead" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Microsoft Outlook sendDraft");
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
