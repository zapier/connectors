import { describe, expect, it } from "vitest";

import addVideoToPlaylistDefinition from "../scripts/addVideoToPlaylist.ts";

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

describe("addVideoToPlaylist: happy path", () => {
  it("POSTs /playlistItems with nested snippet.resourceId and parses against outputSchema", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "playlistItemId789",
        snippet: {
          playlistId: "PLtarget123",
          position: 0,
          resourceId: { kind: "youtube#video", videoId: "dQw4w9WgXcQ" },
        },
        contentDetails: { videoId: "dQw4w9WgXcQ" },
        status: { privacyStatus: "public" },
      });
    }) as typeof globalThis.fetch;

    const { data } = await addVideoToPlaylistDefinition.run(
      addVideoToPlaylistDefinition.inputSchema.parse({
        snippet: {
          playlistId: "PLtarget123",
          resourceId: { kind: "youtube#video", videoId: "dQw4w9WgXcQ" },
        },
      }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("POST");
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/youtube/v3/playlistItems");
    expect(url.searchParams.get("part")).toBe("snippet");

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      snippet: {
        playlistId: string;
        resourceId: { kind: string; videoId: string };
      };
    };
    expect(body.snippet.playlistId).toBe("PLtarget123");
    expect(body.snippet.resourceId.kind).toBe("youtube#video");
    expect(body.snippet.resourceId.videoId).toBe("dQw4w9WgXcQ");

    expect(data.id).toBe("playlistItemId789");
    expect(
      addVideoToPlaylistDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
  });
});

describe("addVideoToPlaylist: error path", () => {
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

    const err = await addVideoToPlaylistDefinition
      .run(
        addVideoToPlaylistDefinition.inputSchema.parse({
          snippet: {
            playlistId: "PLnope",
            resourceId: { videoId: "abc12345678" },
          },
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
  });
});

describe("addVideoToPlaylist: resourceId.kind default", () => {
  it("defaults resourceId.kind to youtube#video when omitted from input", async () => {
    // The default is applied by the inputSchema parse.
    const parsed = addVideoToPlaylistDefinition.inputSchema.parse({
      snippet: {
        playlistId: "PLtarget123",
        resourceId: { videoId: "dQw4w9WgXcQ" },
      },
    });
    expect(parsed.snippet.resourceId.kind).toBe("youtube#video");

    // And it reaches the request body.
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({
        id: "pli1",
        snippet: {
          playlistId: "PLtarget123",
          resourceId: { kind: "youtube#video", videoId: "dQw4w9WgXcQ" },
        },
      });
    }) as typeof globalThis.fetch;

    await addVideoToPlaylistDefinition.run(parsed, { fetch: fakeFetch });

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      snippet: { resourceId: { kind: string } };
    };
    expect(body.snippet.resourceId.kind).toBe("youtube#video");
  });
});
