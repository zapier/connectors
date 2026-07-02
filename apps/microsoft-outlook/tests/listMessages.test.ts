import { describe, expect, it } from "vitest";

import listMessagesDefinition from "../scripts/listMessages.ts";

const { outputSchema } = listMessagesDefinition;

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

const sampleItem = {
  id: "AAMk1",
  subject: "Invoice",
  bodyPreview: "Please find attached",
  from: { emailAddress: { address: "acme@contoso.com", name: "Acme" } },
  receivedDateTime: "2026-06-01T10:00:00Z",
  isRead: false,
  hasAttachments: true,
  importance: "normal",
  webLink: "https://outlook.office.com/...",
};

function capture() {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetch: typeof globalThis.fetch = (async (
    url: string,
    init?: RequestInit,
  ) => {
    calls.push({ url, init });
    return jsonResponse({
      value: [sampleItem],
      "@odata.nextLink":
        "https://graph.microsoft.com/v1.0/me/messages?$skiptoken=X",
    });
  }) as typeof globalThis.fetch;
  return { calls, fetch };
}

describe("listMessages: run", () => {
  it("GETs /me/messages with the default $top and unwraps the envelope", async () => {
    const { calls, fetch } = capture();
    const { data } = await listMessagesDefinition.run({}, { fetch });

    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages?%24top=10",
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.next_cursor).toBe(
      "https://graph.microsoft.com/v1.0/me/messages?$skiptoken=X",
    );
  });

  it("routes folderId to the mailFolders path and quotes the KQL search", async () => {
    const { calls, fetch } = capture();
    await listMessagesDefinition.run(
      { folderId: "inbox", search: "subject:invoice" },
      { fetch },
    );
    expect(calls[0]?.url).toContain("/me/mailFolders/inbox/messages");
    expect(calls[0]?.url).toContain("%24search=%22subject%3Ainvoice%22");
  });

  it("routes a shared mailbox to /users/{upn}", async () => {
    const { calls, fetch } = capture();
    await listMessagesDefinition.run(
      { mailbox: "team@contoso.com" },
      { fetch },
    );
    expect(calls[0]?.url).toContain(
      "https://graph.microsoft.com/v1.0/users/team%40contoso.com/messages",
    );
  });

  it("fetches the cursor URL verbatim when paging", async () => {
    const { calls, fetch } = capture();
    const cursor =
      "https://graph.microsoft.com/v1.0/me/messages?$skiptoken=NEXT";
    await listMessagesDefinition.run({ cursor }, { fetch });
    expect(calls[0]?.url).toBe(cursor);
  });

  it("throws a mapped error on non-2xx", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorAccessDenied", message: "no access" } },
        { status: 403 },
      )) as typeof globalThis.fetch;
    const err = await listMessagesDefinition
      .run({}, { fetch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("listMessages");
    expect((err as Error).message).toContain("ErrorAccessDenied");
  });

  it("rejects search+filter without making an HTTP call", async () => {
    const calls: Array<unknown> = [];
    const fetch: typeof globalThis.fetch = (async (...args: unknown[]) => {
      calls.push(args);
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    const err = await listMessagesDefinition
      .run({ search: "invoice", filter: "isRead eq false" }, { fetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(
      "search and filter cannot be used together",
    );
    expect(calls).toHaveLength(0);
  });

  it("rejects search+mailbox without making an HTTP call", async () => {
    const calls: Array<unknown> = [];
    const fetch: typeof globalThis.fetch = (async (...args: unknown[]) => {
      calls.push(args);
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    const err = await listMessagesDefinition
      .run({ search: "invoice", mailbox: "team@contoso.com" }, { fetch }) // pii:allow
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(
      "search is not supported on shared or delegated mailboxes",
    );
    expect(calls).toHaveLength(0);
  });
});
