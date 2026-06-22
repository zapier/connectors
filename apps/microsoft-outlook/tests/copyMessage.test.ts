import { describe, expect, it } from "vitest";

import copyMessageDefinition from "../scripts/copyMessage.ts";

const { outputSchema } = copyMessageDefinition;

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

describe("copyMessage: run", () => {
  it("POSTs to /me/messages/{id}/copy and returns the new copy", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      // The copy has its own id, distinct from the original.
      return jsonResponse({
        id: "AAMkCopy==",
        parentFolderId: "archiveFolderId",
        subject: "Q4 plan",
      });
    }) as typeof globalThis.fetch;

    const { data } = await copyMessageDefinition.run(
      { messageId: "AAMkOriginal==", destinationId: "archive" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/AAMkOriginal%3D%3D/copy",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      destinationId: "archive",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("AAMkCopy==");
  });

  it("routes to /users/{upn}/messages/{id}/copy when a shared mailbox is supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "AAMkCopy==",
        parentFolderId: "archiveFolderId",
        subject: "Shared",
      });
    }) as typeof globalThis.fetch;

    await copyMessageDefinition.run(
      {
        messageId: "AAMkOriginal==",
        destinationId: "archive",
        mailbox: "team@contoso.com",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/users/team%40contoso.com/messages/AAMkOriginal%3D%3D/copy",
    );
  });

  it("throws a tool-named Error on a 404 Graph response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorItemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await copyMessageDefinition
      .run(
        { messageId: "AAMkOriginal==", destinationId: "archive" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Microsoft Outlook copyMessage");
    expect((err as Error).message).toContain("ErrorItemNotFound");
  });
});
