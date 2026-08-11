import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listMergeRequestDiscussions from "../scripts/listMergeRequestDiscussions.ts";

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

describe("listMergeRequestDiscussions: run", () => {
  it("GETs the /discussions endpoint with the default per_page and wraps the array", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(
        [
          {
            id: "disc-1",
            individual_note: false,
            notes: [
              {
                id: 1,
                body: "Please fix this",
                author: "reviewer",
                system: false,
                resolvable: true,
                resolved: false,
                created_at: "2024-01-01T00:00:00+00:00",
              },
            ],
          },
        ],
        { headers: { "x-next-page": "2" } },
      );
    }) as typeof globalThis.fetch;

    const { data } = await listMergeRequestDiscussions.run(
      listMergeRequestDiscussions.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://gitlab.com/api/v4/projects/12/merge_requests/5/discussions",
    );
    expect(calls[0]?.url).toContain("per_page=20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.nextPage).toBe(2);
    expect(
      listMergeRequestDiscussions.outputSchema.safeParse(data).success,
    ).toBe(true);
  });

  it("returns nextPage=null on the last page (no x-next-page header)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse([], { headers: {} })) as typeof globalThis.fetch;

    const { data } = await listMergeRequestDiscussions.run(
      listMergeRequestDiscussions.inputSchema.parse({
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

    const err = await listMergeRequestDiscussions
      .run(
        listMergeRequestDiscussions.inputSchema.parse({
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
