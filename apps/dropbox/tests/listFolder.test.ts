import { describe, expect, it } from "vitest";

import listFolderDefinition from "../scripts/listFolder.ts";

const { outputSchema } = listFolderDefinition;

function jsonResponse(
  body: unknown,
  init: {
    status?: number;
    ok?: boolean;
    headers?: Record<string, string>;
  } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers(
      init.headers ?? { "content-type": "application/json" },
    ),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

describe("listFolder: run", () => {
  it("renames .tag to type on each entry and surfaces has_more", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        entries: [
          { ".tag": "file", name: "a.txt" },
          { ".tag": "folder", name: "Sub" },
        ],
        cursor: "c1",
        has_more: true,
      });
    }) as typeof globalThis.fetch;

    const result = await listFolderDefinition.run(
      listFolderDefinition.inputSchema.parse({ path: "" }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.dropboxapi.com/2/files/list_folder",
    );
    expect(result.entries[0]?.type).toBe("file");
    expect(result.entries[1]?.type).toBe("folder");
    expect(result.has_more).toBe(true);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("hits /list_folder (not /continue) and includes the default limit when no cursor", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ entries: [], cursor: "c", has_more: false });
    }) as typeof globalThis.fetch;

    await listFolderDefinition.run(
      listFolderDefinition.inputSchema.parse({ path: "" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.dropboxapi.com/2/files/list_folder",
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body.limit).toBe(20);
  });

  it("posts a cursor-only body to /continue when a cursor is given", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ entries: [], cursor: "c2", has_more: false });
    }) as typeof globalThis.fetch;

    await listFolderDefinition.run(
      listFolderDefinition.inputSchema.parse({ cursor: "c1", path: "" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.dropboxapi.com/2/files/list_folder/continue",
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body).toEqual({ cursor: "c1" });
  });

  it("throws a tagged error on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "path/not_found/." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      listFolderDefinition.run(
        listFolderDefinition.inputSchema.parse({ path: "/missing" }),
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Dropbox listFolder/);
  });
});
