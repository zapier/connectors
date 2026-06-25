import { describe, expect, it } from "vitest";

import listAttachmentsDefinition from "../scripts/listAttachments.ts";

const { outputSchema } = listAttachmentsDefinition;

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

const NEXT_LINK =
  "https://graph.microsoft.com/v1.0/me/messages/AAMk%3D%3D/attachments?$skiptoken=abc";

describe("listAttachments: run", () => {
  it("GETs the message's attachments with the default $top=20 and unwraps the envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [
          {
            id: "att1",
            name: "report.pdf",
            contentType: "application/pdf",
            size: 1024,
            isInline: false,
            "@odata.type": "#microsoft.graph.fileAttachment",
          },
        ],
        "@odata.nextLink": NEXT_LINK,
      });
    }) as typeof globalThis.fetch;

    const { data } = await listAttachmentsDefinition.run(
      { messageId: "AAMk==" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/messages/AAMk%3D%3D/attachments?%24top=20",
    );
    expect(calls[0]?.init?.method).toBeUndefined();
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(1);
    // `type` is derived from `@odata.type`.
    expect(data.items[0]?.type).toBe("file");
    expect(data.next_cursor).toBe(NEXT_LINK);
  });

  it("fetches the cursor URL verbatim without rebuilding the path/query", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const cursorUrl = "https://graph.microsoft.com/v1.0/whatever";
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    const { data } = await listAttachmentsDefinition.run(
      { messageId: "AAMk==", cursor: cursorUrl },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(cursorUrl);
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(0);
    expect(data.next_cursor).toBeUndefined();
  });

  it("throws a tool-named Error on a 403 access-denied response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorAccessDenied", message: "denied" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listAttachmentsDefinition
      .run({ messageId: "AAMk==" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(
      "Microsoft Outlook listAttachments",
    );
    expect((err as Error).message).toContain("ErrorAccessDenied");
  });
});
