import { describe, expect, it } from "vitest";

import deleteTaskDefinition from "../scripts/deleteTask.ts";

function emptyResponse(init: { status?: number } = {}): Response {
  const status = init.status ?? 204;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "No Content" : "Error",
    headers: new Headers(),
    text: async () => "",
  } as unknown as Response;
}

describe("deleteTask: run", () => {
  it("DELETEs /me/todo/lists/{listId}/tasks/{taskId} and synthesizes success", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return emptyResponse();
    }) as typeof globalThis.fetch;

    const { data } = await deleteTaskDefinition.run(
      { listId: "list-1", taskId: "task-1" },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks/task-1",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(data).toEqual({ success: true });
  });

  it("throws a mapped error on 401", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Headers(),
        text: async () =>
          JSON.stringify({
            error: { code: "InvalidAuthenticationToken", message: "expired" },
          }),
      }) as unknown as Response) as typeof globalThis.fetch;

    await expect(
      deleteTaskDefinition.run(
        { listId: "list-1", taskId: "task-1" },
        { fetch },
      ),
    ).rejects.toThrow(/reconnect your Microsoft To Do account/);
  });
});
