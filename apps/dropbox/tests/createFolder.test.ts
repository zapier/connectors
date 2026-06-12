import { describe, expect, it } from "vitest";

import createFolderDefinition from "../scripts/createFolder.ts";

const { inputSchema, outputSchema } = createFolderDefinition;

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

describe("createFolder: governance", () => {
  it("is not read-only and not destructive", () => {
    expect(createFolderDefinition.annotations?.readOnlyHint).toBe(false);
    expect(createFolderDefinition.annotations?.destructiveHint).toBe(false);
  });

  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse({ path: "/Projects/2026" }).success).toBe(
      true,
    );
  });
});

describe("createFolder: run", () => {
  it("lifts .metadata and renames .tag to type on success", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        metadata: {
          ".tag": "folder",
          id: "id:1",
          name: "2026",
          path_lower: "/p/2026",
          path_display: "/P/2026",
        },
      });
    }) as typeof globalThis.fetch;

    const result = await createFolderDefinition.run(
      { path: "/P/2026" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.dropboxapi.com/2/files/create_folder_v2",
    );
    expect(result.type).toBe("folder");
    expect(result.name).toBe("2026");
    expect(Object.prototype.hasOwnProperty.call(result, ".tag")).toBe(false);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws a tagged error on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "path/not_found/." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      createFolderDefinition.run({ path: "/P/2026" }, { fetch: fakeFetch }),
    ).rejects.toThrow(/Dropbox createFolder/);
  });

  it("lifts namespace_id into the Dropbox-API-Path-Root header, not the body", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({
        metadata: { ".tag": "folder", id: "id:1", name: "2026" },
      });
    }) as typeof globalThis.fetch;

    await createFolderDefinition.run(
      { path: "/P/2026", namespace_id: "ns:9" },
      { fetch: fakeFetch },
    );

    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers["Dropbox-API-Path-Root"]).toContain("ns:9");

    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect("namespace_id" in body).toBe(false);
    expect(body.path).toBe("/P/2026");
  });
});
