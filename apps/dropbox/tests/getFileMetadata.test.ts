import { describe, expect, it } from "vitest";

import getFileMetadataDefinition from "../scripts/getFileMetadata.ts";

const { inputSchema, outputSchema } = getFileMetadataDefinition;

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

describe("getFileMetadata: governance", () => {
  it("is read-only", () => {
    expect(getFileMetadataDefinition.annotations?.readOnlyHint).toBe(true);
  });

  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({ path: "/Documents/report.pdf" }).success,
    ).toBe(true);
  });
});

describe("getFileMetadata: run", () => {
  it("maps the bare Entry (no .metadata envelope) and renames .tag to type", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        ".tag": "file",
        id: "id:1",
        name: "report.pdf",
        size: 10,
        rev: "abc",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getFileMetadataDefinition.run(
      { path: "/Documents/report.pdf" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.dropboxapi.com/2/files/get_metadata",
    );
    expect(result.type).toBe("file");
    expect(result.size).toBe(10);
    expect(result.rev).toBe("abc");
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
      getFileMetadataDefinition.run(
        { path: "/Documents/report.pdf" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Dropbox getFileMetadata/);
  });
});
