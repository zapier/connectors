import { describe, expect, it } from "vitest";

import getFileContentsDefinition from "../scripts/getFileContents.ts";

const { inputSchema, outputSchema } = getFileContentsDefinition;

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

// For files/download: bytes in the body, metadata in the Dropbox-API-Result header.
function downloadResponse(
  bytes: Uint8Array,
  meta: Record<string, unknown>,
  init: { status?: number; ok?: boolean } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "Dropbox-API-Result": JSON.stringify(meta) }),
    text: async () => new TextDecoder().decode(bytes),
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as unknown as Response;
}

describe("getFileContents: governance", () => {
  it("is read-only and idempotent", () => {
    expect(getFileContentsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(getFileContentsDefinition.annotations?.idempotentHint).toBe(true);
  });

  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse({ path: "/A.txt" }).success).toBe(true);
  });
});

describe("getFileContents: run", () => {
  it("returns inline UTF-8 text from the download body", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      downloadResponse(new TextEncoder().encode("hello world"), {
        name: "a.txt",
        path_display: "/A.txt",
        rev: "r1",
        size: 11,
      })) as typeof globalThis.fetch;

    const { data: result } = await getFileContentsDefinition.run(
      getFileContentsDefinition.inputSchema.parse({ path: "/A.txt" }),
      { fetch: fakeFetch },
    );

    expect(result.is_text).toBe(true);
    expect(result.content).toBe("hello world");
    expect(result.truncated).toBe(false);
    expect(result.name).toBe("a.txt");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("detects binary via the NUL-byte heuristic and points to getTemporaryLink", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      downloadResponse(new Uint8Array([104, 105, 0, 7]), {
        name: "x.bin",
        size: 4,
      })) as typeof globalThis.fetch;

    const { data: result } = await getFileContentsDefinition.run(
      getFileContentsDefinition.inputSchema.parse({ path: "/x.bin" }),
      { fetch: fakeFetch },
    );

    expect(result.is_text).toBe(false);
    expect(result.content).toContain("getTemporaryLink");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("truncates to the leading max_bytes slice", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      downloadResponse(new TextEncoder().encode("abcdefgh"), {
        name: "big.txt",
        size: 8,
      })) as typeof globalThis.fetch;

    const { data: result } = await getFileContentsDefinition.run(
      getFileContentsDefinition.inputSchema.parse({
        path: "/big.txt",
        max_bytes: 4,
      }),
      { fetch: fakeFetch },
    );

    expect(result.truncated).toBe(true);
    expect(result.content).toBe("abcd");
    expect(getFileContentsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws a tagged error on a non-OK download", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error_summary: "path/not_found/." },
        { status: 409 },
      )) as typeof globalThis.fetch;

    await expect(
      getFileContentsDefinition.run(
        getFileContentsDefinition.inputSchema.parse({ path: "/missing.txt" }),
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Dropbox getFileContents/);
  });
});
