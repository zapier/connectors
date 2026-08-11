import { describe, expect, it } from "vitest";

import listWorkItems from "../scripts/listWorkItems.ts";

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

describe("listWorkItems: run", () => {
  it("POSTs the GraphQL query and maps nodes into the { items, nextCursor } envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          namespace: {
            workItems: {
              pageInfo: { endCursor: "c", hasNextPage: true },
              nodes: [
                {
                  id: "gid://gitlab/WorkItem/1",
                  iid: "1",
                  title: "First",
                  state: "opened",
                  webUrl: "https://gitlab.com/g/p/-/work_items/1",
                  workItemType: { name: "Issue" },
                },
              ],
            },
          },
        },
      });
    }) as typeof globalThis.fetch;

    const { data } = await listWorkItems.run(
      listWorkItems.inputSchema.parse({ namespacePath: "group/project" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://gitlab.com/api/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain("query ListWorkItems");
    expect(body.variables.fullPath).toBe("group/project");
    expect(body.variables.first).toBe(20);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.workItemType).toBe("Issue");
    expect(data.nextCursor).toBe("c");
    expect(listWorkItems.outputSchema.safeParse(data).success).toBe(true);
  });

  it("returns nextCursor=null when there is no next page", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        data: {
          namespace: {
            workItems: {
              pageInfo: { endCursor: "c", hasNextPage: false },
              nodes: [],
            },
          },
        },
      })) as typeof globalThis.fetch;

    const { data } = await listWorkItems.run(
      listWorkItems.inputSchema.parse({ namespacePath: "group" }),
      { fetch: fakeFetch },
    );

    expect(data.items).toHaveLength(0);
    expect(data.nextCursor).toBeNull();
  });

  it("throws a plain Error on a top-level GraphQL errors array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "boom" }],
      })) as typeof globalThis.fetch;

    await expect(
      listWorkItems.run(
        listWorkItems.inputSchema.parse({ namespacePath: "group" }),
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/boom/);
  });
});
