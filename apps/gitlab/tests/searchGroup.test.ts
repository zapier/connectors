import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import searchGroup from "../scripts/searchGroup.ts";

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

describe("searchGroup: run", () => {
  it("forwards search + scope params on the group-scoped endpoint", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse([{ id: 9, name: "proj" }], {
        headers: { "x-next-page": "2" },
      });
    }) as typeof globalThis.fetch;

    const { data } = await searchGroup.run(
      searchGroup.inputSchema.parse({
        groupId: "42",
        search: "widget",
        scope: "projects",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://gitlab.com/api/v4/groups/42/search",
    );
    expect(calls[0]?.url).toContain("search=widget");
    expect(calls[0]?.url).toContain("scope=projects");
    expect(calls[0]?.url).toContain("per_page=20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.nextPage).toBe(2);
    expect(searchGroup.outputSchema.safeParse(data).success).toBe(true);
  });

  it("URL-encodes a full group path and returns nextPage=null on the last page", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse([], { headers: {} });
    }) as typeof globalThis.fetch;

    const { data } = await searchGroup.run(
      searchGroup.inputSchema.parse({
        groupId: "parent/sub",
        search: "x",
        scope: "issues",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("/groups/parent%2Fsub/search");
    expect(data.nextPage).toBeNull();
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await searchGroup
      .run(
        searchGroup.inputSchema.parse({
          groupId: "42",
          search: "x",
          scope: "issues",
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
