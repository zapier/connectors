import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listMergeRequests from "../scripts/listMergeRequests.ts";

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

describe("listMergeRequests: run", () => {
  it("GETs the identity-scoped MR list and wraps the array in { items, nextPage }", async () => {
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
          {
            iid: 2,
            title: "B",
            state: "opened",
            source_branch: "g",
            target_branch: "main",
            web_url: "u2",
            draft: true,
          },
        ],
        { headers: { "x-next-page": "2" } },
      );
    }) as typeof globalThis.fetch;

    const { data } = await listMergeRequests.run(
      listMergeRequests.inputSchema.parse({ state: "opened" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("https://gitlab.com/api/v4/merge_requests");
    expect(calls[0]?.url).toContain("state=opened");
    expect(calls[0]?.url).toContain("per_page=20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.items).toHaveLength(2);
    expect(data.nextPage).toBe(2);
    expect(listMergeRequests.outputSchema.safeParse(data).success).toBe(true);
  });

  it("returns nextPage=null on the last page (no x-next-page header)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse([], { headers: {} })) as typeof globalThis.fetch;

    const { data } = await listMergeRequests.run(
      listMergeRequests.inputSchema.parse({}),
      { fetch: fakeFetch },
    );
    expect(data.items).toHaveLength(0);
    expect(data.nextPage).toBeNull();
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "401 Unauthorized" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listMergeRequests
      .run(listMergeRequests.inputSchema.parse({}), { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
