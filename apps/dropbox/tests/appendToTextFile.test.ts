import { describe, expect, it } from "vitest";

import appendToTextFileDefinition from "../scripts/appendToTextFile.ts";

const { inputSchema, outputSchema } = appendToTextFileDefinition;

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

describe("appendToTextFile: governance", () => {
  it("is not read-only and not destructive", () => {
    expect(appendToTextFileDefinition.annotations?.readOnlyHint).toBe(false);
    expect(appendToTextFileDefinition.annotations?.destructiveHint).toBe(false);
  });

  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({ path: "/Logs/run.log", content: "line2" })
        .success,
    ).toBe(true);
  });
});

describe("appendToTextFile: run", () => {
  it("read-modify-write: appends to an existing file with an update=<rev> mode", async () => {
    const uploads: Array<{ init: RequestInit | undefined }> = [];
    // Dispatch by URL substring across the three calls (get_metadata, download, upload).
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      if (url.includes("get_metadata")) {
        return jsonResponse({ rev: "r1", name: "run.log" });
      }
      if (url.includes("files/download")) {
        return downloadResponse(new TextEncoder().encode("line1"), {
          name: "run.log",
        });
      }
      // files/upload
      uploads.push({ init });
      return jsonResponse({
        ".tag": "file",
        id: "id:1",
        name: "run.log",
        rev: "r2",
        size: 11,
      });
    }) as typeof globalThis.fetch;

    const result = await appendToTextFileDefinition.run(
      { path: "/Logs/run.log", content: "line2" },
      { fetch: fakeFetch },
    );

    expect(result.was_created).toBe(false);
    expect(result.name).toBe("run.log");
    expect(outputSchema.safeParse(result).success).toBe(true);

    // Existing content + newline + new content was re-uploaded.
    expect(uploads).toHaveLength(1);
    expect(uploads[0]?.init?.body).toBe("line1\nline2");

    const headers = uploads[0]?.init?.headers as Record<string, string>;
    const apiArg = JSON.parse(headers["Dropbox-API-Arg"]) as Record<
      string,
      unknown
    >;
    expect(apiArg.mode).toEqual({ ".tag": "update", update: "r1" });
  });

  it("read-modify-write: creates the file when metadata lookup is not found", async () => {
    const uploads: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      if (url.includes("get_metadata")) {
        return jsonResponse(
          { error_summary: "path/not_found/." },
          { status: 409 },
        );
      }
      // files/upload — no download call happens on the create path.
      uploads.push({ init });
      return jsonResponse({
        ".tag": "file",
        id: "id:2",
        name: "new.log",
        rev: "r1",
        size: 5,
      });
    }) as typeof globalThis.fetch;

    const result = await appendToTextFileDefinition.run(
      { path: "/Logs/new.log", content: "first" },
      { fetch: fakeFetch },
    );

    expect(result.was_created).toBe(true);
    expect(outputSchema.safeParse(result).success).toBe(true);

    // Fresh file: body is just the new content, mode is add.
    expect(uploads).toHaveLength(1);
    expect(uploads[0]?.init?.body).toBe("first");

    const headers = uploads[0]?.init?.headers as Record<string, string>;
    const apiArg = JSON.parse(headers["Dropbox-API-Arg"]) as Record<
      string,
      unknown
    >;
    expect(apiArg.mode).toEqual({ ".tag": "add" });
  });
});
