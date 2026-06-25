import { describe, expect, it } from "vitest";

import updateVideoDefinition from "../scripts/updateVideo.ts";

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

describe("updateVideo: happy path", () => {
  it("reads current snippet, merges only the changed field, and carries categoryId forward", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    let n = 0;
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      n++;
      if (n === 1) {
        return jsonResponse({
          items: [
            {
              id: "vid-1",
              snippet: {
                title: "Old",
                categoryId: "22",
                description: "keep",
              },
              status: { privacyStatus: "public" },
            },
          ],
        });
      }
      return jsonResponse({
        id: "vid-1",
        snippet: {
          title: "New",
          categoryId: "22",
          description: "keep",
        },
        status: { privacyStatus: "public" },
      });
    }) as typeof globalThis.fetch;

    const { data } = await updateVideoDefinition.run(
      { video_id: "vid-1", title: "New" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]?.init?.method).toBe("GET");
    expect(calls[1]?.init?.method).toBe("PUT");

    const putBody = JSON.parse(calls[1]?.init?.body as string) as {
      id: string;
      snippet: { title?: string; categoryId?: string; description?: string };
    };
    expect(putBody.id).toBe("vid-1");
    expect(putBody.snippet.title).toBe("New");
    expect(putBody.snippet.categoryId).toBe("22");
    expect(putBody.snippet.description).toBe("keep");

    expect(updateVideoDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
    expect(data.snippet?.title).toBe("New");
  });
});

describe("updateVideo: not found", () => {
  it("rejects when the GET returns no items", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({ items: [] })) as typeof globalThis.fetch;

    await expect(
      updateVideoDefinition.run(
        { video_id: "missing", title: "x" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/no video found/);
  });
});
