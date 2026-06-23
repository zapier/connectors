import { describe, expect, it } from "vitest";

import listCaptionsDefinition from "../scripts/listCaptions.ts";

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

describe("listCaptions: happy path", () => {
  it("GETs /captions with part + videoId and parses against outputSchema", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        items: [
          {
            id: "captionTrackId123",
            snippet: {
              videoId: "dQw4w9WgXcQ",
              language: "en",
              name: "English",
              trackKind: "standard",
              status: "serving",
              isAutoSynced: false,
              lastUpdated: "2020-01-01T00:00:00Z",
            },
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await listCaptionsDefinition.run(
      listCaptionsDefinition.inputSchema.parse({ videoId: "dQw4w9WgXcQ" }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("GET");
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/youtube/v3/captions");
    expect(url.searchParams.get("videoId")).toBe("dQw4w9WgXcQ");
    expect(url.searchParams.get("part")).toBe("snippet");
    expect(data.items).toHaveLength(1);
    expect(listCaptionsDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });
});

describe("listCaptions: error path", () => {
  it("rejects on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: 404,
            message: "the resource does not exist",
            errors: [{ reason: "notFound" }],
          },
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listCaptionsDefinition
      .run(
        listCaptionsDefinition.inputSchema.parse({ videoId: "doesNotExist" }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
  });
});

describe("listCaptions: required input", () => {
  it("requires videoId — inputSchema rejects when omitted", () => {
    expect(listCaptionsDefinition.inputSchema.safeParse({}).success).toBe(
      false,
    );
    expect(
      listCaptionsDefinition.inputSchema.safeParse({ videoId: "abc" }).success,
    ).toBe(true);
  });
});
