import { afterEach, describe, expect, it, vi } from "vitest";

import uploadVideoDefinition from "../scripts/uploadVideo.ts";

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({
      "content-type": "application/json",
      ...(init.headers ?? {}),
    }),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

function binaryResponse(
  bytes: Uint8Array,
  contentType = "video/mp4",
): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": contentType }),
    arrayBuffer: async () => bytes.buffer,
    text: async () => "",
    json: async () => ({}),
  } as unknown as Response;
}

const validInput = {
  video_url: "https://example.com/clip.mp4",
  title: "My Clip",
  privacy_status: "private" as const,
  notify_subscribers: true,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("uploadVideo: happy path", () => {
  it("opens a resumable session, PUTs the bytes, and derives watch/embed URLs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      binaryResponse(new Uint8Array([1, 2, 3])),
    );

    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    let n = 0;
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      n++;
      if (n === 1) {
        return jsonResponse(
          {},
          { headers: { location: "https://upload.example/session" } },
        );
      }
      return jsonResponse({
        id: "abc123XYZ",
        snippet: { title: "My Clip" },
        status: { uploadStatus: "uploaded", privacyStatus: "private" },
      });
    }) as typeof globalThis.fetch;

    const { data } = await uploadVideoDefinition.run(validInput, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[1]?.url).toBe("https://upload.example/session");
    expect(calls[1]?.init?.method).toBe("PUT");

    expect(data.watch_url).toBe("https://www.youtube.com/watch?v=abc123XYZ");
    expect(data.embed_url).toBe("https://www.youtube.com/embed/abc123XYZ");
    expect(uploadVideoDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });
});

describe("uploadVideo: error path", () => {
  it("rejects when the session response has no Location header", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      binaryResponse(new Uint8Array([1, 2, 3])),
    );

    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({})) as typeof globalThis.fetch;

    await expect(
      uploadVideoDefinition.run(validInput, { fetch: fakeFetch }),
    ).rejects.toThrow(/Location header missing/);
  });

  it("translates the Zapier-relay binary-body rejection into an actionable error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      binaryResponse(new Uint8Array([1, 2, 3])),
    );

    // Session-open (string body) succeeds; the binary PUT is what the relay rejects.
    let n = 0;
    const fakeFetch: typeof globalThis.fetch = (async () => {
      n++;
      if (n === 1) {
        return jsonResponse(
          {},
          { headers: { location: "https://upload.example/session" } },
        );
      }
      throw new Error(
        "buildZapierFetch: Zapier-mode `fetch` only accepts `body: string`. " +
          "Streaming bodies, `FormData`, `Blob`, and `ArrayBuffer` are not supported in Zapier mode.",
      );
    }) as typeof globalThis.fetch;

    await expect(
      uploadVideoDefinition.run(validInput, { fetch: fakeFetch }),
    ).rejects.toThrow(/Zapier connection relay does not support/);
  });
});
