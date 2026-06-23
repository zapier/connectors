import { describe, expect, it } from "vitest";

import deleteVideoDefinition from "../scripts/deleteVideo.ts";

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

describe("deleteVideo: happy path", () => {
  it("DELETEs videos with id and returns a synthesized success", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({}, { status: 200 });
    }) as typeof globalThis.fetch;

    const { data } = await deleteVideoDefinition.run(
      { id: "dQw4w9WgXcQ" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(calls[0]?.url).toContain("/youtube/v3/videos");
    expect(calls[0]?.url).toContain("id=dQw4w9WgXcQ");
    expect(data).toEqual({ success: true });
    expect(deleteVideoDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });
});

describe("deleteVideo: error path", () => {
  it("rejects on a 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 403,
            message: "You do not own this video.",
            errors: [{ reason: "forbidden" }],
          },
        },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      deleteVideoDefinition.run({ id: "x" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});

describe("deleteVideo: governance", () => {
  it("is flagged destructive (deletion is irreversible)", () => {
    expect(deleteVideoDefinition.annotations?.destructiveHint).toBe(true);
  });
});
