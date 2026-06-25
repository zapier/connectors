import { describe, expect, it } from "vitest";

import getMessageDefinition from "../scripts/getMessage.ts";

const { outputSchema } = getMessageDefinition;

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

const fullMessage = {
  id: "AAMk1",
  subject: "Invoice",
  body: { contentType: "text", content: "Plain text body" },
  from: { emailAddress: { address: "acme@contoso.com" } },
  isRead: true,
  internetMessageId: "<abc@contoso.com>",
};

function capture() {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetch: typeof globalThis.fetch = (async (
    url: string,
    init?: RequestInit,
  ) => {
    calls.push({ url, init });
    return jsonResponse(fullMessage);
  }) as typeof globalThis.fetch;
  return { calls, fetch };
}

describe("getMessage: run", () => {
  it("GETs the message and defaults the Prefer body type to text", async () => {
    const { calls, fetch } = capture();
    const { data } = await getMessageDefinition.run(
      { messageId: "AAMk1" },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/AAMk1",
    );
    expect(new Headers(calls[0]?.init?.headers).get("Prefer")).toBe(
      'outlook.body-content-type="text"',
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.internetMessageId).toBe("<abc@contoso.com>");
  });

  it("requests html when bodyContentType is html and routes a shared mailbox", async () => {
    const { calls, fetch } = capture();
    await getMessageDefinition.run(
      {
        messageId: "AAMk1",
        bodyContentType: "html",
        mailbox: "team@contoso.com",
      },
      { fetch },
    );
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/users/team%40contoso.com/messages/AAMk1",
    );
    expect(new Headers(calls[0]?.init?.headers).get("Prefer")).toBe(
      'outlook.body-content-type="html"',
    );
  });

  it("throws a mapped stale-id hint on 404", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;
    const err = await getMessageDefinition
      .run({ messageId: "stale" }, { fetch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("getMessage");
    expect((err as Error).message).toContain("stale");
  });
});
