import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listMergeRequestCommits from "../scripts/listMergeRequestCommits.ts";

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

describe("listMergeRequestCommits: run", () => {
  it("GETs the /commits endpoint and wraps the array in { items, nextPage }", async () => {
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
            title: "Fix bug",
            author_name: "Octo Cat",
            created_at: "2024-01-01T00:00:00+00:00",
          },
        ],
        { headers: { "x-next-page": "2" } },
      );
    }) as typeof globalThis.fetch;

    const { data } = await listMergeRequestCommits.run(
      listMergeRequestCommits.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/merge_requests/5/commits",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.nextPage).toBe(2);
    expect(listMergeRequestCommits.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("returns nextPage=null on the last page (no x-next-page header)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse([], { headers: {} })) as typeof globalThis.fetch;

    const { data } = await listMergeRequestCommits.run(
      listMergeRequestCommits.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
      }),
      { fetch: fakeFetch },
    );
    expect(data.items).toHaveLength(0);
    expect(data.nextPage).toBeNull();
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listMergeRequestCommits
      .run(
        listMergeRequestCommits.inputSchema.parse({
          projectId: "12",
          mergeRequestIid: 5,
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
