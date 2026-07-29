import { describe, expect, it } from "vitest";

import createTaskDefinition from "../scripts/createTask.ts";

const { inputSchema, outputSchema } = createTaskDefinition;

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

describe("createTask: run", () => {
  it("defaults to the built-in Tasks list when listId is omitted", async () => {
    const { calls, fetch } = capture({
      id: "task-1",
      title: "Buy milk",
      status: "notStarted",
    });

    const { data } = await createTaskDefinition.run(
      inputSchema.parse({ title: "Buy milk" }),
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/Tasks/tasks",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      title: "Buy milk",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("uses the given listId and passes dueDateTime through as a { dateTime, timeZone } object", async () => {
    const { calls, fetch } = capture({
      id: "task-2",
      title: "Ship report",
      status: "notStarted",
      dueDateTime: { dateTime: "2026-07-01T09:00:00", timeZone: "UTC" },
    });

    await createTaskDefinition.run(
      inputSchema.parse({
        listId: "list-1",
        title: "Ship report",
        dueDateTime: { dateTime: "2026-07-01T09:00:00", timeZone: "UTC" },
      }),
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks",
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      dueDateTime: { dateTime: "2026-07-01T09:00:00", timeZone: "UTC" },
    });
  });

  it("throws a mapped error on 403 (insufficient scope)", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorAccessDenied", message: "Access is denied" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      createTaskDefinition.run(inputSchema.parse({ title: "x" }), { fetch }),
    ).rejects.toThrow(/grant Tasks.ReadWrite/);
  });
});
