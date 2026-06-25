import { describe, expect, it } from "vitest";

import forwardMessageDefinition from "../scripts/forwardMessage.ts";

const { outputSchema } = forwardMessageDefinition;

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

describe("forwardMessage: run", () => {
  it("POSTs to /messages/{id}/forward with toRecipients + comment and returns { success: true } on 202", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return noBodyResponse(202);
    }) as typeof globalThis.fetch;

    const { data } = await forwardMessageDefinition.run(
      {
        messageId: "msg1",
        toRecipients: [{ emailAddress: { address: "jane@contoso.com" } }],
        comment: "FYI",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/msg1/forward",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      toRecipients: [{ emailAddress: { address: "jane@contoso.com" } }],
      comment: "FYI",
    });
    expect(data).toEqual({ success: true });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("omits comment from the body when it is not provided", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return noBodyResponse(202);
    }) as typeof globalThis.fetch;

    const { data } = await forwardMessageDefinition.run(
      {
        messageId: "msg2",
        toRecipients: [{ emailAddress: { address: "jane@contoso.com" } }],
      },
      { fetch: fakeFetch },
    );

    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect(sentBody).toEqual({
      toRecipients: [{ emailAddress: { address: "jane@contoso.com" } }],
    });
    expect("comment" in sentBody).toBe(false);
    expect(data).toEqual({ success: true });
  });

  it("throws a tool-named Error on a non-OK Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "no such message" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await forwardMessageDefinition
      .run(
        {
          messageId: "gone",
          toRecipients: [{ emailAddress: { address: "jane@contoso.com" } }],
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(
      "Microsoft Outlook forwardMessage",
    );
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
