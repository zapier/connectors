import { describe, expect, it } from "vitest";

import listTasksDefinition from "../scripts/listTasks.ts";

const { inputSchema, outputSchema } = listTasksDefinition;

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

const sampleTask = {
  id: "task-1",
  title: "Buy milk",
  status: "notStarted",
};

function capture(response: unknown) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetch: typeof globalThis.fetch = (async (
    url: string,
    init?: RequestInit,
  ) => {
    calls.push({ url, init });
    return jsonResponse(response);
  }) as typeof globalThis.fetch;
  return { calls, fetch };
}

describe("listTasks: run", () => {
  it("defaults to the built-in Tasks list when listId is omitted", async () => {
    const { calls, fetch } = capture({ value: [sampleTask] });

    const { data } = await listTasksDefinition.run(inputSchema.parse({}), {
      fetch,
    });

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/Tasks/tasks?%24top=10",
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("uses the given listId and forwards filter/orderby as $-prefixed OData params", async () => {
    const { calls, fetch } = capture({ value: [] });

    await listTasksDefinition.run(
      inputSchema.parse({
        listId: "list-1",
        filter: "status ne 'completed'",
        orderby: "createdDateTime desc",
      }),
      { fetch },
    );

    const url = new URL(calls[0]?.url as string);
    expect(url.pathname).toBe("/v1.0/me/todo/lists/list-1/tasks");
    expect(url.searchParams.get("$filter")).toBe("status ne 'completed'");
    expect(url.searchParams.get("$orderby")).toBe("createdDateTime desc");
  });

  it("refetches a given cursor verbatim instead of rebuilding the query", async () => {
    const { calls, fetch } = capture({ value: [] });
    const cursor =
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks?$top=10&$skiptoken=tok123";

    await listTasksDefinition.run(inputSchema.parse({ cursor }), { fetch });

    expect(calls[0]?.url).toBe(cursor);
  });

  it("throws a mapped error when throttled, surfacing Retry-After", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: new Headers({ "Retry-After": "5" }),
        text: async () =>
          JSON.stringify({
            error: { code: "TooManyRequests", message: "throttled" },
          }),
      }) as unknown as Response) as typeof globalThis.fetch;

    await expect(
      listTasksDefinition.run(inputSchema.parse({}), { fetch }),
    ).rejects.toThrow(/retry after 5s/);
  });
});
