import { describe, expect, it } from "vitest";

import listSharedFoldersDefinition from "../scripts/listSharedFolders.ts";

const { inputSchema, outputSchema } = listSharedFoldersDefinition;

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

describe("listSharedFolders: governance", () => {
  it("flags read-only listing", () => {
    expect(listSharedFoldersDefinition.annotations?.readOnlyHint).toBe(true);
  });

  it("defaults limit to 20 when omitted", () => {
    const parsed = inputSchema.parse({});
    expect(parsed.limit).toBe(20);
  });
});

describe("listSharedFolders: run", () => {
  it("passes folder entries through (no .tag mapping) and surfaces them as folders", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        entries: [
          { shared_folder_id: "sf1", name: "Team", access_type: "editor" },
        ],
        cursor: "c",
      })) as typeof globalThis.fetch;

    const result = await listSharedFoldersDefinition.run(
      inputSchema.parse({}),
      { fetch: fakeFetch },
    );

    expect(result).toEqual({
      folders: [
        { shared_folder_id: "sf1", name: "Team", access_type: "editor" },
      ],
      cursor: "c",
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("sends the default limit of 20 to /list_folders when no limit is passed", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ entries: [], cursor: undefined });
    }) as typeof globalThis.fetch;

    await listSharedFoldersDefinition.run(inputSchema.parse({}), {
      fetch: fakeFetch,
    });

    expect(calls[0]?.url).toBe(
      "https://api.dropboxapi.com/2/sharing/list_folders",
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body.limit).toBe(20);
  });

  it("hits the /continue endpoint with a cursor-only body on a continuation page", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ entries: [], cursor: undefined });
    }) as typeof globalThis.fetch;

    await listSharedFoldersDefinition.run(inputSchema.parse({ cursor: "c1" }), {
      fetch: fakeFetch,
    });

    expect(calls[0]?.url).toBe(
      "https://api.dropboxapi.com/2/sharing/list_folders/continue",
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body).toEqual({ cursor: "c1" });
  });
});
