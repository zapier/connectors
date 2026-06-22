import { describe, expect, it } from "vitest";

import getAttachmentDefinition from "../scripts/getAttachment.ts";

const { outputSchema } = getAttachmentDefinition;

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

describe("getAttachment: run", () => {
  it("GETs the attachment by id and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "att1",
        name: "report.pdf",
        type: "file",
        contentBytes: "AAAA",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getAttachmentDefinition.run(
      { messageId: "AAMk==", attachmentId: "att1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/AAMk%3D%3D/attachments/att1",
    );
    expect(calls[0]?.init?.method).toBeUndefined();
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.contentBytes).toBe("AAAA");
  });

  it("routes to /users/{upn} when a shared mailbox is supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "att1", name: "report.pdf", type: "file" });
    }) as typeof globalThis.fetch;

    const { data } = await getAttachmentDefinition.run(
      {
        messageId: "AAMk==",
        attachmentId: "att1",
        mailbox: "team@contoso.com",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/users/team%40contoso.com/messages/AAMk%3D%3D/attachments/att1",
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a tool-named Error on a 403 access-denied response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorAccessDenied", message: "denied" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await getAttachmentDefinition
      .run({ messageId: "AAMk==", attachmentId: "att1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain("Microsoft Outlook getAttachment");
    expect((err as Error).message).toContain("ErrorAccessDenied");
  });
});
