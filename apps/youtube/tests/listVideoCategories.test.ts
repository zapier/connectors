import { describe, expect, it } from "vitest";

import listVideoCategoriesDefinition from "../scripts/listVideoCategories.ts";

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

describe("listVideoCategories: happy path", () => {
  it("GETs /videoCategories with part + regionCode and parses against outputSchema", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        items: [
          {
            id: "10",
            snippet: { title: "Music", assignable: true },
          },
        ],
      });
    }) as typeof globalThis.fetch;

    const { data } = await listVideoCategoriesDefinition.run(
      listVideoCategoriesDefinition.inputSchema.parse({ regionCode: "GB" }),
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.method).toBe("GET");
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/youtube/v3/videoCategories");
    expect(url.searchParams.get("regionCode")).toBe("GB");
    expect(url.searchParams.get("part")).toBe("snippet");
    expect(data.items).toHaveLength(1);
    expect(
      listVideoCategoriesDefinition.outputSchema.safeParse(data).success,
    ).toBe(true);
  });
});

describe("listVideoCategories: error path", () => {
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

    const err = await listVideoCategoriesDefinition
      .run(
        listVideoCategoriesDefinition.inputSchema.parse({ regionCode: "ZZ" }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
  });
});

describe("listVideoCategories: defaults", () => {
  it("defaults regionCode to US when omitted", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ items: [] });
    }) as typeof globalThis.fetch;

    const { data } = await listVideoCategoriesDefinition.run(
      listVideoCategoriesDefinition.inputSchema.parse({}),
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("regionCode")).toBe("US");
    expect(data.items).toEqual([]);
  });
});
