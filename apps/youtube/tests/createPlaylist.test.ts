import { describe, expect, it } from "vitest";

import createPlaylistDefinition from "../scripts/createPlaylist.ts";

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

describe("createPlaylist: happy path", () => {
  it("POSTs /playlists with snippet + status body and parses against outputSchema", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "PLnewPlaylist123",
        snippet: {
          title: "My Mix",
          description: "Favourites",
          channelId: "UCabc",
          publishedAt: "2026-06-23T00:00:00Z",
        },
        status: { privacyStatus: "unlisted" },
        contentDetails: { itemCount: 0 },
      });
    }) as typeof globalThis.fetch;

    const { data } = await createPlaylistDefinition.run(
      createPlaylistDefinition.inputSchema.parse({
        snippet: { title: "My Mix", description: "Favourites" },
        status: { privacyStatus: "unlisted" },
      }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("POST");
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/youtube/v3/playlists");
    expect(url.searchParams.get("part")).toBe("snippet,status");

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      snippet: { title: string; description?: string };
      status: { privacyStatus: string };
    };
    expect(body.snippet.title).toBe("My Mix");
    expect(body.snippet.description).toBe("Favourites");
    expect(body.status.privacyStatus).toBe("unlisted");

    expect(data.id).toBe("PLnewPlaylist123");
    expect(createPlaylistDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });
});

describe("createPlaylist: error path", () => {
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

    const err = await createPlaylistDefinition
      .run(
        createPlaylistDefinition.inputSchema.parse({ snippet: { title: "x" } }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
  });
});

describe("createPlaylist: optional status", () => {
  it("omits status from the body when not supplied", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ id: "PLx", snippet: { title: "Title only" } });
    }) as typeof globalThis.fetch;

    await createPlaylistDefinition.run(
      createPlaylistDefinition.inputSchema.parse({
        snippet: { title: "Title only" },
      }),
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body).toHaveProperty("snippet");
    expect(body).not.toHaveProperty("status");
  });
});
