import { describe, expect, it } from "vitest";

import updatePlaylistDefinition from "../scripts/updatePlaylist.ts";

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

describe("updatePlaylist: happy path", () => {
  it("PUTs /playlists with id + snippet body and parses against outputSchema", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "PLexisting123",
        snippet: { title: "Renamed", description: "Updated" },
        status: { privacyStatus: "private" },
        contentDetails: { itemCount: 4 },
      });
    }) as typeof globalThis.fetch;

    const { data } = await updatePlaylistDefinition.run(
      updatePlaylistDefinition.inputSchema.parse({
        id: "PLexisting123",
        snippet: { title: "Renamed", description: "Updated" },
        status: { privacyStatus: "private" },
      }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("PUT");
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/youtube/v3/playlists");
    expect(url.searchParams.get("part")).toBe("snippet,status");

    const body = JSON.parse(calls[0]?.init?.body as string) as {
      id: string;
      snippet: { title: string; description?: string };
      status: { privacyStatus: string };
    };
    expect(body.id).toBe("PLexisting123");
    expect(body.snippet.title).toBe("Renamed");
    expect(body.status.privacyStatus).toBe("private");

    expect(data.id).toBe("PLexisting123");
    expect(updatePlaylistDefinition.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });
});

describe("updatePlaylist: error path", () => {
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

    const err = await updatePlaylistDefinition
      .run(
        updatePlaylistDefinition.inputSchema.parse({
          id: "PLnope",
          snippet: { title: "x" },
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
  });
});

describe("updatePlaylist: body shape", () => {
  it("always includes the playlist id in the PUT body", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ id: "PLabc", snippet: { title: "T" } });
    }) as typeof globalThis.fetch;

    await updatePlaylistDefinition.run(
      updatePlaylistDefinition.inputSchema.parse({
        id: "PLabc",
        snippet: { title: "T" },
      }),
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body.id).toBe("PLabc");
    expect(body).not.toHaveProperty("status");
  });
});
