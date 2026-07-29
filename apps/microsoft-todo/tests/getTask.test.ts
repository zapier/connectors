import { describe, expect, it } from "vitest";

import getTaskDefinition from "../scripts/getTask.ts";

const { outputSchema } = getTaskDefinition;

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

describe("getTask: run", () => {
  it("GETs /me/todo/lists/{listId}/tasks/{taskId} and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "task-1",
        title: "Buy milk",
        status: "notStarted",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getTaskDefinition.run(
      { listId: "list-1", taskId: "task-1" },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks/task-1",
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.title).toBe("Buy milk");
  });

  it("throws a mapped error when the task id is stale (moved to another list)", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: "ErrorInvalidIdMalformed",
            message: "The task id is malformed",
          },
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    await expect(
      getTaskDefinition.run({ listId: "list-1", taskId: "stale" }, { fetch }),
    ).rejects.toThrow(/moves to another list/);
  });

  it("maps ErrorInvalidIdMalformed nested under error.innerError.code (the actual live Graph shape, confirmed against the real API — a 400 with the code one level deeper than error.code)", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: "invalidRequest",
            message: "Invalid request",
            innerError: { code: "ErrorInvalidIdMalformed" },
          },
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    await expect(
      getTaskDefinition.run({ listId: "list-1", taskId: "bogus" }, { fetch }),
    ).rejects.toThrow(/moves to another list/);
  });
});
