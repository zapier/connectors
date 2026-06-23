import { describe, expect, it } from "vitest";

import deletePlaylistDefinition from "../scripts/deletePlaylist.ts";

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

describe("deletePlaylist: happy path", () => {
  it("DELETEs playlists with id and returns a synthesized success", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({}, { status: 200 });
    }) as typeof globalThis.fetch;

    const { data } = await deletePlaylistDefinition.run(
      { id: "PLabc123" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(calls[0]?.url).toContain("/youtube/v3/playlists");
    expect(calls[0]?.url).toContain("id=PLabc123");
    expect(data).toEqual({ success: true });
    expect(deletePlaylistDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });
});

describe("deletePlaylist: error path", () => {
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
      deletePlaylistDefinition.run({ id: "x" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});

describe("deletePlaylist: governance", () => {
  it("is flagged destructive (deletion is irreversible)", () => {
    expect(deletePlaylistDefinition.annotations?.destructiveHint).toBe(true);
  });
});
