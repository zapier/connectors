import { describe, expect, it } from "vitest";

import getWorkItem from "../scripts/getWorkItem.ts";

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

describe("getWorkItem: run", () => {
  it("POSTs the GraphQL query and extracts the description from the widgets", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: {
          workItem: {
            id: "gid://gitlab/WorkItem/123",
            iid: "7",
            title: "A task",
            state: "opened",
            webUrl: "https://gitlab.com/g/p/-/work_items/7",
            workItemType: { name: "Task" },
            widgets: [{ description: "body" }],
          },
        },
      });
    }) as typeof globalThis.fetch;

    const { data } = await getWorkItem.run(
      getWorkItem.inputSchema.parse({ id: "gid://gitlab/WorkItem/123" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://gitlab.com/api/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain("query GetWorkItem");
    expect(body.variables.id).toBe("gid://gitlab/WorkItem/123");
    expect(data.description).toBe("body");
    expect(data.workItemType).toBe("Task");
    expect(getWorkItem.outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a plain Error on a top-level GraphQL errors array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "nope" }],
      })) as typeof globalThis.fetch;

    await expect(
      getWorkItem.run(
        getWorkItem.inputSchema.parse({ id: "gid://gitlab/WorkItem/123" }),
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/nope/);
  });
});
