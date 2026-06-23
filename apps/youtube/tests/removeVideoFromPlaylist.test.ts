import { describe, expect, it } from "vitest";

import removeVideoFromPlaylistDefinition from "../scripts/removeVideoFromPlaylist.ts";

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

describe("removeVideoFromPlaylist: happy path", () => {
  it("DELETEs playlistItems with the playlistItem id and returns success", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({}, { status: 200 });
    }) as typeof globalThis.fetch;

    const { data } = await removeVideoFromPlaylistDefinition.run(
      { id: "PLI_item_abc" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(calls[0]?.url).toContain("/youtube/v3/playlistItems");
    expect(calls[0]?.url).toContain("id=PLI_item_abc");
    expect(data).toEqual({ success: true });
    expect(
      removeVideoFromPlaylistDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
  });
});

describe("removeVideoFromPlaylist: error path", () => {
  it("rejects on a 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "You do not own this playlist.",
            errors: [{ reason: "forbidden" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      removeVideoFromPlaylistDefinition.run({ id: "x" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});

describe("removeVideoFromPlaylist: governance", () => {
  it("is NOT destructive — removal is reversible via addVideoToPlaylist", () => {
    expect(removeVideoFromPlaylistDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});
