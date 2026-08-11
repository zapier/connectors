import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listProjectMergeRequests from "../scripts/listProjectMergeRequests.ts";

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

describe("listProjectMergeRequests: run", () => {
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
            iid: 1,
            title: "A",
            state: "opened",
            source_branch: "f",
            target_branch: "main",
            web_url: "u",
            draft: false,
          },
        ],
        { headers: { "x-next-page": "2" } },
      );
    }) as typeof globalThis.fetch;

    const { data } = await listProjectMergeRequests.run(
      listProjectMergeRequests.inputSchema.parse({ projectId: "12" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://gitlab.com/api/v4/projects/12/merge_requests",
    );
    expect(calls[0]?.url).toContain("per_page=20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.nextPage).toBe(2);
    expect(listProjectMergeRequests.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("returns nextPage=null on the last page and forwards filters as snake_case params", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse([], { headers: {} });
    }) as typeof globalThis.fetch;

    const { data } = await listProjectMergeRequests.run(
      listProjectMergeRequests.inputSchema.parse({
        projectId: "12",
        state: "merged",
        author_username: "octocat",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("state=merged");
    expect(calls[0]?.url).toContain("author_username=octocat");
    expect(data.nextPage).toBeNull();
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "401 Unauthorized" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listProjectMergeRequests
      .run(listProjectMergeRequests.inputSchema.parse({ projectId: "12" }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
