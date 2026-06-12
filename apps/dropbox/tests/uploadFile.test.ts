import { afterEach, describe, expect, it, vi } from "vitest";

import uploadFileDefinition from "../scripts/uploadFile.ts";

const { inputSchema, outputSchema } = uploadFileDefinition;

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("uploadFile: governance", () => {
  it("is not read-only and not destructive", () => {
    expect(uploadFileDefinition.annotations?.readOnlyHint).toBe(false);
    expect(uploadFileDefinition.annotations?.destructiveHint).toBe(false);
  });

  it("accepts a minimal valid input", () => {
    expect(
      inputSchema.safeParse({
        file_url: "https://host/photo.jpg",
        path: "/Uploads/photo.jpg",
      }).success,
    ).toBe(true);
  });
});

describe("uploadFile: run", () => {
  it("downloads the source URL then uploads, mapping the result", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode("data").buffer,
    } as unknown as Response);

    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const ctxFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        ".tag": "file",
        id: "id:1",
        name: "photo.jpg",
        size: 4,
      });
    }) as typeof globalThis.fetch;

    const result = await uploadFileDefinition.run(
      uploadFileDefinition.inputSchema.parse({
        file_url: "https://host/photo.jpg",
        path: "/Uploads/photo.jpg",
      }),
      { fetch: ctxFetch },
    );

    expect(result.name).toBe("photo.jpg");
    expect(result.type).toBe("file");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("uses the single-request upload path for a small file (no upload_session)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode("data").buffer,
    } as unknown as Response);

    const calls: Array<{ url: string }> = [];
    const ctxFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ ".tag": "file", id: "id:1", name: "photo.jpg" });
    }) as typeof globalThis.fetch;

    await uploadFileDefinition.run(
      uploadFileDefinition.inputSchema.parse({
        file_url: "https://host/photo.jpg",
        path: "/Uploads/photo.jpg",
      }),
      { fetch: ctxFetch },
    );

    // The whole file fits the single-request ceiling: exactly one Dropbox call,
    // to files/upload, never the chunked upload_session endpoints.
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://content.dropboxapi.com/2/files/upload");
    expect(calls.some((c) => c.url.includes("upload_session"))).toBe(false);
  });

  it("throws when the source URL cannot be downloaded", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    const ctxFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({ ".tag": "file" })) as typeof globalThis.fetch;

    await expect(
      uploadFileDefinition.run(
        uploadFileDefinition.inputSchema.parse({
          file_url: "https://host/photo.jpg",
          path: "/Uploads/photo.jpg",
        }),
        { fetch: ctxFetch },
      ),
    ).rejects.toThrow(/could not download/);
  });
});
