import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listGroupMergeRequests from "../scripts/listGroupMergeRequests.ts";

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

describe("listGroupMergeRequests: run", () => {
  it("GETs the group-scoped MR list and wraps the array in { items, nextPage }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(
        [
          {
            iid: 7,
            title: "A",
            state: "merged",
            source_branch: "f",
            target_branch: "main",
            web_url: "u",
            draft: false,
          },
        ],
        { headers: { "x-next-page": "2" } },
      );
    }) as typeof globalThis.fetch;

    const { data } = await listGroupMergeRequests.run(
      listGroupMergeRequests.inputSchema.parse({
        groupId: "42",
        state: "merged",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://gitlab.com/api/v4/groups/42/merge_requests",
    );
    expect(calls[0]?.url).toContain("state=merged");
    expect(calls[0]?.url).toContain("per_page=20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.nextPage).toBe(2);
    expect(listGroupMergeRequests.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("URL-encodes a full group path and returns nextPage=null on the last page", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse([], { headers: {} });
    }) as typeof globalThis.fetch;

    const { data } = await listGroupMergeRequests.run(
      listGroupMergeRequests.inputSchema.parse({ groupId: "group/sub" }),
      { fetch: fakeFetch },
    );
    expect(calls[0]?.url).toContain("/groups/group%2Fsub/merge_requests");
    expect(data.nextPage).toBeNull();
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listGroupMergeRequests
      .run(listGroupMergeRequests.inputSchema.parse({ groupId: "42" }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
