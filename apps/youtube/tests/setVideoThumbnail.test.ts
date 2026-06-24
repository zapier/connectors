import { afterEach, describe, expect, it, vi } from "vitest";

import setVideoThumbnailDefinition from "../scripts/setVideoThumbnail.ts";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

function binaryResponse(
  bytes: Uint8Array,
  contentType = "image/jpeg",
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
  video_id: "vid-1",
  image_url: "https://example.com/thumb.jpg",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("setVideoThumbnail: happy path", () => {
  it("downloads the image, POSTs to the upload host, and parses the result", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      binaryResponse(new Uint8Array([255, 216, 255])),
    );

    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        items: [
          { default: { url: "https://i.ytimg.com/vi/vid-1/default.jpg" } },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await setVideoThumbnailDefinition.run(validInput, {
      fetch: fakeFetch,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("/upload/youtube/v3/thumbnails/set");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(data.items).toHaveLength(1);
    expect(
      setVideoThumbnailDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
  });
});

describe("setVideoThumbnail: error path", () => {
  it("rejects when the image fetch is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse("not found", { status: 404 }),
    );

    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({ items: [] })) as typeof globalThis.fetch;

    await expect(
      setVideoThumbnailDefinition.run(validInput, { fetch: fakeFetch }),
    ).rejects.toThrow(/could not fetch image_url/);
  });

  it("translates a 403 forbidden into verified-account guidance", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      binaryResponse(new Uint8Array([255, 216, 255])),
    );

    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message:
              "The user doesn't have permissions to upload and set custom video thumbnails.",
            errors: [{ reason: "forbidden" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      setVideoThumbnailDefinition.run(validInput, { fetch: fakeFetch }),
    ).rejects.toThrow(/verified YouTube account/i);
  });

  it("translates a 403 insufficientPermissions into a scope-reconnect message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      binaryResponse(new Uint8Array([255, 216, 255])),
    );

    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "Insufficient permission.",
            errors: [{ reason: "insufficientPermissions" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      setVideoThumbnailDefinition.run(validInput, { fetch: fakeFetch }),
    ).rejects.toThrow(/youtube\.upload scope/i);
  });
});
