import { describe, expect, it } from "vitest";

import createReplyDraftDefinition from "../scripts/createReplyDraft.ts";

const { outputSchema } = createReplyDraftDefinition;

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

describe("createReplyDraft: run", () => {
  it("POSTs to /messages/{id}/createReply and returns the parsed draft", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "AAMkReplyDraft==",
        subject: "RE: Q4 plan",
        isDraft: true,
        webLink: "https://outlook.office365.com/reply-draft",
      });
    }) as typeof globalThis.fetch;

    const { data } = await createReplyDraftDefinition.run(
      { messageId: "msg1", comment: "On it" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/msg1/createReply",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      comment: "On it",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("routes replyAll: true to /messages/{id}/createReplyAll", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "AAMkReplyAllDraft==",
        subject: "RE: Q4 plan",
        isDraft: true,
      });
    }) as typeof globalThis.fetch;

    const { data } = await createReplyDraftDefinition.run(
      { messageId: "msg2", replyAll: true },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/msg2/createReplyAll",
    );
    // No comment → body is an empty object.
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({});
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a tool-named Error on a non-OK Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "no such message" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await createReplyDraftDefinition
      .run({ messageId: "gone" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(
      "Microsoft Outlook createReplyDraft",
    );
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
