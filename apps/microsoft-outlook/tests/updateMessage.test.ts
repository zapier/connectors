import { describe, expect, it } from "vitest";

import updateMessageDefinition from "../scripts/updateMessage.ts";

const { outputSchema } = updateMessageDefinition;

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

describe("updateMessage: run", () => {
  it("PATCHes /me/messages/{id} with only the fields set and returns the parsed message", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "AAMkMsg==",
        subject: "Q4 plan",
        isRead: true,
        categories: [],
      });
    }) as typeof globalThis.fetch;

    const { data } = await updateMessageDefinition.run(
      { messageId: "AAMkMsg==", isRead: true },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/AAMkMsg%3D%3D",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    // Body must contain ONLY isRead — no messageId, no other keys.
    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect(sentBody).toEqual({ isRead: true });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("sets flag and categories together when both are supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "AAMkMsg==",
        subject: "Q4 plan",
        isRead: false,
        categories: ["Red category"],
        flag: { flagStatus: "flagged" },
      });
    }) as typeof globalThis.fetch;

    const { data } = await updateMessageDefinition.run(
      {
        messageId: "AAMkMsg==",
        categories: ["Red category"],
        flag: { flagStatus: "flagged" },
      },
      { fetch: fakeFetch },
    );

    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect(sentBody).toEqual({
      categories: ["Red category"],
      flag: { flagStatus: "flagged" },
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("routes to /users/{upn}/messages/{id} when a shared mailbox is supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "AAMkMsg==",
        subject: "Shared",
        isRead: true,
      });
    }) as typeof globalThis.fetch;

    await updateMessageDefinition.run(
      { messageId: "AAMkMsg==", isRead: true, mailbox: "team@contoso.com" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/users/team%40contoso.com/messages/AAMkMsg%3D%3D",
    );
    // mailbox is a routing input, never part of the PATCH body.
    const sentBody = JSON.parse(calls[0]?.init?.body as string);
    expect("mailbox" in sentBody).toBe(false);
  });

  it("rejects a flag with dueDateTime but no startDateTime (input validation)", async () => {
    const calls: Array<unknown> = [];
    const fakeFetch: typeof globalThis.fetch = (async (...args: unknown[]) => {
      calls.push(args);
      return jsonResponse({ id: "x", subject: "x", isRead: false });
    }) as typeof globalThis.fetch;

    const err = await updateMessageDefinition
      .run(
        {
          messageId: "AAMkMsg==",
          flag: {
            flagStatus: "flagged",
            dueDateTime: { dateTime: "2026-08-01T17:00:00", timeZone: "UTC" },
          },
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(
      "dueDateTime requires startDateTime",
    );
    expect(calls).toHaveLength(0);
  });

  it("throws a tool-named Error on a 404 Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await updateMessageDefinition
      .run({ messageId: "AAMkMsg==", isRead: true }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Microsoft Outlook updateMessage");
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
