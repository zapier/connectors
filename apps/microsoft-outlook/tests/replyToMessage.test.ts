import { describe, expect, it } from "vitest";

import replyToMessageDefinition from "../scripts/replyToMessage.ts";

const { outputSchema } = replyToMessageDefinition;

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

describe("replyToMessage: run", () => {
  it("POSTs to /messages/{id}/reply with a comment body and returns { success: true } on 202", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return noBodyResponse(202);
    }) as typeof globalThis.fetch;

    const { data } = await replyToMessageDefinition.run(
      { messageId: "msg1", comment: "Thanks!" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/msg1/reply",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      comment: "Thanks!",
    });
    expect(data).toEqual({ success: true });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("routes replyAll: true to /messages/{id}/replyAll and omits comment when not provided", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return noBodyResponse(202);
    }) as typeof globalThis.fetch;

    const { data } = await replyToMessageDefinition.run(
      { messageId: "msg2", replyAll: true },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/msg2/replyAll",
    );
    // No comment → body is an empty object (no `comment` key).
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({});
    expect(data).toEqual({ success: true });
  });

  it("throws a tool-named Error on a non-OK Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "no such message" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await replyToMessageDefinition
      .run({ messageId: "gone" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(
      "Microsoft Outlook replyToMessage",
    );
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
