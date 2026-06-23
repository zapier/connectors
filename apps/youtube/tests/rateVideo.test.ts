import { describe, expect, it } from "vitest";

import rateVideoDefinition from "../scripts/rateVideo.ts";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("rateVideo: happy path", () => {
  it("POSTs videos/rate with id + rating and returns a synthesized success", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      // videos.rate returns 204 No Content on success.
      return jsonResponse({}, { status: 204 });
    }) as typeof globalThis.fetch;

    const { data } = await rateVideoDefinition.run(
      { id: "dQw4w9WgXcQ", rating: "like" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.url).toContain("/youtube/v3/videos/rate");
    expect(calls[0]?.url).toContain("id=dQw4w9WgXcQ");
    expect(calls[0]?.url).toContain("rating=like");
    expect(data).toEqual({ success: true });
    expect(rateVideoDefinition.outputSchema.safeParse(data).success).toBe(true);
  });
});

describe("rateVideo: error path", () => {
  it("rejects on a 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "Access denied.",
            errors: [{ reason: "forbidden" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      rateVideoDefinition.run(
        { id: "x", rating: "dislike" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});

describe("rateVideo: governance", () => {
  it("is idempotent — setting the same rating twice leaves the same state", () => {
    expect(rateVideoDefinition.annotations?.idempotentHint).toBe(true);
  });
});
