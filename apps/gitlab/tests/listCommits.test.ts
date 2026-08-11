import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listCommits from "../scripts/listCommits.ts";

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

describe("listCommits: run", () => {
  it("applies the default per_page and wraps the array in the { items, nextPage } envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(
        [
          {
            id: "abc123def456",
            short_id: "abc123d",
            title: "Initial commit",
            author_name: "Octo Cat",
            created_at: "2024-01-01T00:00:00+00:00",
            web_url: "https://gitlab.com/g/p/-/commit/abc123def456",
          },
        ],
        { headers: { "x-next-page": "2" } },
      );
    }) as typeof globalThis.fetch;

    const { data } = await listCommits.run(
      listCommits.inputSchema.parse({ projectId: "12" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://gitlab.com/api/v4/projects/12/repository/commits",
    );
    expect(calls[0]?.url).toContain("per_page=20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({ id: "abc123def456" });
    expect(data.nextPage).toBe(2);
    expect(listCommits.outputSchema.safeParse(data).success).toBe(true);
  });

  it("forwards ref_name and since filters and returns nextPage=null on the last page", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse([], { headers: {} });
    }) as typeof globalThis.fetch;

    const { data } = await listCommits.run(
      listCommits.inputSchema.parse({
        projectId: "12",
        ref_name: "main",
        since: "2024-01-01T00:00:00+00:00",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("ref_name=main");
    expect(calls[0]?.url).toContain("since=");
    expect(data.nextPage).toBeNull();
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listCommits
      .run(listCommits.inputSchema.parse({ projectId: "12" }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
