import { describe, expect, it } from "vitest";

import listMailFoldersDefinition from "../scripts/listMailFolders.ts";

const { outputSchema } = listMailFoldersDefinition;

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

const FOLDERS = {
  value: [
    {
      id: "folder1",
      displayName: "Inbox",
      parentFolderId: "root",
      childFolderCount: 2,
      unreadItemCount: 3,
      totalItemCount: 10,
    },
  ],
};

describe("listMailFolders: run", () => {
  it("GETs /me/mailFolders with the default $top=20 when no parentFolderId is given", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(FOLDERS);
    }) as typeof globalThis.fetch;

    const { data } = await listMailFoldersDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/mailFolders?%24top=20",
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.next_cursor).toBeUndefined();
  });

  it("GETs the childFolders path when parentFolderId is supplied", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(FOLDERS);
    }) as typeof globalThis.fetch;

    const { data } = await listMailFoldersDefinition.run(
      { parentFolderId: "inbox" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/childFolders?%24top=20",
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(1);
  });

  it("throws a tool-named Error on a 403 access-denied response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorAccessDenied", message: "denied" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listMailFoldersDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(
      "Microsoft Outlook listMailFolders",
    );
    expect((err as Error).message).toContain("ErrorAccessDenied");
  });
});
