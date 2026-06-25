import { describe, expect, it } from "vitest";

import createDraftDefinition from "../scripts/createDraft.ts";

const { outputSchema } = createDraftDefinition;

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

describe("createDraft: run", () => {
  it("POSTs to /me/messages, strips mailbox from the body, and returns the parsed draft", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "AAMkDraft==",
        subject: "Q4 plan",
        isDraft: true,
        bodyPreview: "Here is the plan",
        toRecipients: [{ emailAddress: { address: "jane@contoso.com" } }],
        webLink: "https://outlook.office365.com/draft",
      });
    }) as typeof globalThis.fetch;

    const { data } = await createDraftDefinition.run(
      {
        subject: "Q4 plan",
        body: { contentType: "text", content: "Here is the plan" },
        toRecipients: [{ emailAddress: { address: "jane@contoso.com" } }],
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://graph.microsoft.com/v1.0/me/messages");
    expect(calls[0]?.init?.method).toBe("POST");
    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect(sentBody).toMatchObject({
      subject: "Q4 plan",
      body: { contentType: "text", content: "Here is the plan" },
      toRecipients: [{ emailAddress: { address: "jane@contoso.com" } }],
    });
    expect("mailbox" in sentBody).toBe(false);
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("routes to /users/{upn}/messages when a shared mailbox is supplied (and still strips mailbox)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "AAMkShared==",
        subject: "Shared draft",
        isDraft: true,
      });
    }) as typeof globalThis.fetch;

    const { data } = await createDraftDefinition.run(
      {
        subject: "Shared draft",
        toRecipients: [{ emailAddress: { address: "jane@contoso.com" } }],
        mailbox: "team@contoso.com",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/users/team%40contoso.com/messages",
    );
    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect("mailbox" in sentBody).toBe(false);
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a tool-named Error on a non-OK Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: { code: "ErrorItemNotFound", message: "not found" },
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await createDraftDefinition
      .run(
        {
          subject: "x",
          toRecipients: [{ emailAddress: { address: "jane@contoso.com" } }],
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Microsoft Outlook createDraft");
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
