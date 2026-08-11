import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import searchProject from "../scripts/searchProject.ts";

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

describe("searchProject: run", () => {
  it("forwards search + scope params on the project-scoped endpoint", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse([{ iid: 7, title: "hit" }], {
        headers: { "x-next-page": "2" },
      });
    }) as typeof globalThis.fetch;

    const { data } = await searchProject.run(
      searchProject.inputSchema.parse({
        projectId: "12",
        search: "auth",
        scope: "merge_requests",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://gitlab.com/api/v4/projects/12/search",
    );
    expect(calls[0]?.url).toContain("search=auth");
    expect(calls[0]?.url).toContain("scope=merge_requests");
    expect(calls[0]?.url).toContain("per_page=20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.nextPage).toBe(2);
    expect(searchProject.outputSchema.safeParse(data).success).toBe(true);
  });

  it("URL-encodes a full group/project path and returns nextPage=null on the last page", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse([], { headers: {} });
    }) as typeof globalThis.fetch;

    const { data } = await searchProject.run(
      searchProject.inputSchema.parse({
        projectId: "group/project",
        search: "x",
        scope: "issues",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("/projects/group%2Fproject/search");
    expect(data.nextPage).toBeNull();
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await searchProject
      .run(
        searchProject.inputSchema.parse({
          projectId: "12",
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
