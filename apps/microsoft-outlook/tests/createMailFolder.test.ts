import { describe, expect, it } from "vitest";

import createMailFolderDefinition from "../scripts/createMailFolder.ts";

const { outputSchema } = createMailFolderDefinition;

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

describe("createMailFolder: run", () => {
  it("POSTs to /me/mailFolders with the displayName body and returns the parsed folder", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "folder1",
        displayName: "Receipts",
        parentFolderId: "root",
      });
    }) as typeof globalThis.fetch;

    const { data } = await createMailFolderDefinition.run(
      { displayName: "Receipts" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/mailFolders",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      displayName: "Receipts",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("folder1");
  });

  it("POSTs to the childFolders path when parentFolderId is supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "folder2", displayName: "Sub" });
    }) as typeof globalThis.fetch;

    const { data } = await createMailFolderDefinition.run(
      { displayName: "Sub", parentFolderId: "inbox" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/childFolders",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      displayName: "Sub",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a tool-named Error on a 403 access-denied response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorAccessDenied", message: "denied" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await createMailFolderDefinition
      .run({ displayName: "Receipts" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(
      "Microsoft Outlook createMailFolder",
    );
    expect((err as Error).message).toContain("ErrorAccessDenied");
  });
});
