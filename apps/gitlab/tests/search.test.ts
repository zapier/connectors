import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import search from "../scripts/search.ts";

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({
      "content-type": "application/json",
      ...init.headers,
    }),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

describe("search: run", () => {
  it("forwards search + scope query params and wraps the array in the envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse([{ iid: 3, title: "found" }], {
        headers: { "x-next-page": "2" },
      });
    }) as typeof globalThis.fetch;

    const { data } = await search.run(
      search.inputSchema.parse({ search: "bug", scope: "issues" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("https://gitlab.com/api/v4/search");
    expect(calls[0]?.url).toContain("search=bug");
    expect(calls[0]?.url).toContain("scope=issues");
    expect(calls[0]?.url).toContain("per_page=20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.nextPage).toBe(2);
    expect(search.outputSchema.safeParse(data).success).toBe(true);
  });

  it("returns nextPage=null on the last page", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse([], { headers: {} })) as typeof globalThis.fetch;

    const { data } = await search.run(
      search.inputSchema.parse({ search: "x", scope: "projects" }),
      { fetch: fakeFetch },
    );
    expect(data.nextPage).toBeNull();
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "403 Forbidden" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await search
      .run(search.inputSchema.parse({ search: "x", scope: "blobs" }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
