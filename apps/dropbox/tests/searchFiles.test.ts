import { describe, expect, it } from "vitest";

import searchFilesDefinition from "../scripts/searchFiles.ts";

const { outputSchema } = searchFilesDefinition;

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

describe("searchFiles: run", () => {
  it("unwraps the double-nested metadata and renames .tag to type", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        matches: [
          {
            metadata: {
              metadata: { ".tag": "file", name: "f.pdf", id: "id:1" },
            },
          },
        ],
        cursor: "c",
        has_more: false,
      });
    }) as typeof globalThis.fetch;

    const result = await searchFilesDefinition.run(
      searchFilesDefinition.inputSchema.parse({ query: "x" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.dropboxapi.com/2/files/search_v2");
    expect(result.matches[0]?.type).toBe("file");
    expect(result.matches[0]?.name).toBe("f.pdf");
    expect(result.has_more).toBe(false);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("nests filters under options with .tag-wrapped enums and max_results", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ matches: [], cursor: "c", has_more: false });
    }) as typeof globalThis.fetch;

    await searchFilesDefinition.run(
      searchFilesDefinition.inputSchema.parse({
        query: "x",
        file_status: "active",
        file_categories: ["pdf"],
        limit: 5,
      }),
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      options: {
        max_results: number;
        file_status: unknown;
        file_categories: unknown;
      };
    };
    expect(body.options.max_results).toBe(5);
    expect(body.options.file_status).toEqual({ ".tag": "active" });
    expect(body.options.file_categories).toEqual([{ ".tag": "pdf" }]);
  });

  it("posts a cursor-only body to /continue_v2 when a cursor is given", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ matches: [], cursor: "c3", has_more: false });
    }) as typeof globalThis.fetch;

    await searchFilesDefinition.run(
      searchFilesDefinition.inputSchema.parse({ query: "x", cursor: "c2" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.dropboxapi.com/2/files/search/continue_v2",
    );
    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body).toEqual({ cursor: "c2" });
  });

  it("throws a tagged error on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "path/not_found/." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      searchFilesDefinition.run(
        searchFilesDefinition.inputSchema.parse({ query: "x" }),
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Dropbox searchFiles/);
  });
});
