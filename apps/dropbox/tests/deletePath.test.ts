import { describe, expect, it } from "vitest";

import deletePathDefinition from "../scripts/deletePath.ts";

const { inputSchema, outputSchema } = deletePathDefinition;

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

describe("deletePath: governance", () => {
  it("is flagged destructive", () => {
    expect(deletePathDefinition.annotations?.destructiveHint).toBe(true);
  });

  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse({ path: "/Old/notes.txt" }).success).toBe(
      true,
    );
  });
});

describe("deletePath: run", () => {
  it("renames .tag to type on success", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        metadata: { ".tag": "deleted", name: "notes.txt" },
      });
    }) as typeof globalThis.fetch;

    const result = await deletePathDefinition.run(
      { path: "/Old/notes.txt" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.dropboxapi.com/2/files/delete_v2");
    expect(result.type).toBe("deleted");
    expect(result.name).toBe("notes.txt");
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
      deletePathDefinition.run(
        { path: "/Old/notes.txt" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Dropbox deletePath/);
  });
});
