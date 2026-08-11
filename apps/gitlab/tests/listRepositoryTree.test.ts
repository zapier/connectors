import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listRepositoryTree from "../scripts/listRepositoryTree.ts";

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

describe("listRepositoryTree: run", () => {
  it("applies the default per_page and wraps the array in the { items, nextPage } envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(
        [
          { id: "a1", name: "src", type: "tree", path: "src" },
          { id: "b2", name: "README.md", type: "blob", path: "README.md" },
        ],
        { headers: { "x-next-page": "2" } },
      );
    }) as typeof globalThis.fetch;

    const { data } = await listRepositoryTree.run(
      listRepositoryTree.inputSchema.parse({ projectId: "12" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://gitlab.com/api/v4/projects/12/repository/tree",
    );
    expect(calls[0]?.url).toContain("per_page=20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.items).toHaveLength(2);
    expect(data.items[0]).toMatchObject({ name: "src", type: "tree" });
    expect(data.nextPage).toBe(2);
    expect(listRepositoryTree.outputSchema.safeParse(data).success).toBe(true);
  });

  it("forwards path, ref, and recursive params and returns nextPage=null on the last page", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse([], { headers: {} });
    }) as typeof globalThis.fetch;

    const { data } = await listRepositoryTree.run(
      listRepositoryTree.inputSchema.parse({
        projectId: "12",
        path: "src",
        ref: "main",
        recursive: true,
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("path=src");
    expect(calls[0]?.url).toContain("ref=main");
    expect(calls[0]?.url).toContain("recursive=true");
    expect(data.nextPage).toBeNull();
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listRepositoryTree
      .run(listRepositoryTree.inputSchema.parse({ projectId: "12" }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
