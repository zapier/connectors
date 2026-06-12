import { describe, expect, it } from "vitest";

import copyFileDefinition from "../scripts/copyFile.ts";

const { inputSchema, outputSchema } = copyFileDefinition;

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

describe("copyFile: governance", () => {
  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({
        from_path: "/Templates/base.docx",
        to_path: "/Projects/base.docx",
      }).success,
    ).toBe(true);
  });
});

describe("copyFile: run", () => {
  it("renames .tag to type and sends from_path + to_path in the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        metadata: {
          ".tag": "file",
          id: "id:1",
          name: "base.docx",
          path_display: "/Projects/base.docx",
        },
      });
    }) as typeof globalThis.fetch;

    const result = await copyFileDefinition.run(
      { from_path: "/Templates/base.docx", to_path: "/Projects/base.docx" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.dropboxapi.com/2/files/copy_v2");
    expect(result.type).toBe("file");
    expect(Object.prototype.hasOwnProperty.call(result, ".tag")).toBe(false);
    expect(outputSchema.safeParse(result).success).toBe(true);

    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body.from_path).toBe("/Templates/base.docx");
    expect(body.to_path).toBe("/Projects/base.docx");
    // copyFile never sends allow_ownership_transfer (it has no such input).
    expect("allow_ownership_transfer" in body).toBe(false);
  });

  it("throws a tagged error on a non-OK response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "path/not_found/." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      copyFileDefinition.run(
        { from_path: "/a", to_path: "/b" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Dropbox copyFile/);
  });
});
