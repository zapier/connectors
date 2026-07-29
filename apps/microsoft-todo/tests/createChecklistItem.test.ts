import { describe, expect, it } from "vitest";

import createChecklistItemDefinition from "../scripts/createChecklistItem.ts";

const { outputSchema } = createChecklistItemDefinition;

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

describe("createChecklistItem: run", () => {
  it("POSTs displayName (isChecked omitted when not sent)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "step-1",
        displayName: "Buy eggs",
        isChecked: false,
      });
    }) as typeof globalThis.fetch;

    const { data } = await createChecklistItemDefinition.run(
      { listId: "list-1", taskId: "task-1", displayName: "Buy eggs" },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks/task-1/checklistItems",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      displayName: "Buy eggs",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("passes isChecked through when sent", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({
        id: "step-2",
        displayName: "Buy milk",
        isChecked: true,
      });
    }) as typeof globalThis.fetch;

    await createChecklistItemDefinition.run(
      {
        listId: "list-1",
        taskId: "task-1",
        displayName: "Buy milk",
        isChecked: true,
      },
      { fetch },
    );

    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      displayName: "Buy milk",
      isChecked: true,
    });
  });

  it("throws a mapped error on 403", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorAccessDenied", message: "Access is denied" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    await expect(
      createChecklistItemDefinition.run(
        { listId: "list-1", taskId: "task-1", displayName: "x" },
        { fetch },
      ),
    ).rejects.toThrow(/grant Tasks.ReadWrite/);
  });
});
