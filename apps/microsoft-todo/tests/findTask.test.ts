import { describe, expect, it } from "vitest";

import findTaskDefinition from "../scripts/findTask.ts";

const { inputSchema, outputSchema } = findTaskDefinition;

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

describe("findTask: run", () => {
  it("defaults to the built-in Tasks list and excludes completed tasks", async () => {
    const { calls, fetch } = capture({
      value: [{ id: "task-1", title: "Buy milk", status: "notStarted" }],
    });

    const { data } = await findTaskDefinition.run(
      inputSchema.parse({ title: "Buy milk" }),
      { fetch },
    );

    const url = new URL(calls[0]?.url as string);
    expect(url.pathname).toBe("/v1.0/me/todo/lists/Tasks/tasks");
    expect(url.searchParams.get("$filter")).toBe(
      "title eq 'Buy milk' and status ne 'completed'",
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("includes completed tasks when includeCompleted is true", async () => {
    const { calls, fetch } = capture({ value: [] });

    await findTaskDefinition.run(
      inputSchema.parse({
        listId: "list-1",
        title: "Buy milk",
        includeCompleted: true,
      }),
      { fetch },
    );

    const url = new URL(calls[0]?.url as string);
    expect(url.pathname).toBe("/v1.0/me/todo/lists/list-1/tasks");
    expect(url.searchParams.get("$filter")).toBe("title eq 'Buy milk'");
  });

  it("doubles single quotes in title for OData escaping", async () => {
    const { calls, fetch } = capture({ value: [] });

    await findTaskDefinition.run(
      inputSchema.parse({ title: "Manager's 1:1" }),
      { fetch },
    );

    const url = new URL(calls[0]?.url as string);
    expect(url.searchParams.get("$filter")).toBe(
      "title eq 'Manager''s 1:1' and status ne 'completed'",
    );
  });

  it("refetches a given cursor verbatim instead of rebuilding the filter", async () => {
    const { calls, fetch } = capture({ value: [] });
    const cursor =
      "https://graph.microsoft.com/v1.0/me/todo/lists/Tasks/tasks?$filter=title+eq+%27Buy+milk%27&$skiptoken=tok123";

    await findTaskDefinition.run(
      inputSchema.parse({ title: "Buy milk", cursor }),
      { fetch },
    );

    expect(calls[0]?.url).toBe(cursor);
  });

  it("throws a mapped error on 401", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "InvalidAuthenticationToken", message: "expired" } },
        { status: 401 },
      )) as typeof globalThis.fetch;

    await expect(
      findTaskDefinition.run(inputSchema.parse({ title: "x" }), { fetch }),
    ).rejects.toThrow(/reconnect your Microsoft To Do account/);
  });
});
