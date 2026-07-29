import { describe, expect, it } from "vitest";

import completeTaskDefinition from "../scripts/completeTask.ts";

const { outputSchema } = completeTaskDefinition;

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

describe("completeTask: run", () => {
  it("PATCHes { status: completed } to the task", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "task-1",
        title: "Buy milk",
        status: "completed",
        completedDateTime: {
          dateTime: "2026-07-15T18:00:00.000Z",
          timeZone: "UTC",
        },
      });
    }) as typeof globalThis.fetch;

    const { data } = await completeTaskDefinition.run(
      { listId: "list-1", taskId: "task-1" },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks/task-1",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      status: "completed",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.status).toBe("completed");
  });

  it("throws a mapped error on a stale/malformed task id", async () => {
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
      completeTaskDefinition.run(
        { listId: "list-1", taskId: "stale" },
        { fetch },
      ),
    ).rejects.toThrow(/moves to another list/);
  });
});
