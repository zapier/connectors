import { describe, expect, it } from "vitest";

import updateChecklistItemDefinition from "../scripts/updateChecklistItem.ts";

const { outputSchema } = updateChecklistItemDefinition;

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

describe("updateChecklistItem: run", () => {
  it("PATCHes only isChecked when only that field is sent (check off a step)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "step-1",
        displayName: "Buy eggs",
        isChecked: true,
        checkedDateTime: "2026-07-27T22:39:42Z",
      });
    }) as typeof globalThis.fetch;

    const { data } = await updateChecklistItemDefinition.run(
      {
        listId: "list-1",
        taskId: "task-1",
        checklistItemId: "step-1",
        isChecked: true,
      },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks/task-1/checklistItems/step-1",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      isChecked: true,
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.isChecked).toBe(true);
    // Graph sets checkedDateTime server-side when a step is checked off
    // (confirmed live) — the connector must not drop it on parse.
    expect(data.checkedDateTime).toBe("2026-07-27T22:39:42Z");
  });

  it("throws a mapped error on a malformed checklist item id", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: "ErrorInvalidIdMalformed",
            message: "The checklist item id is malformed",
          },
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    await expect(
      updateChecklistItemDefinition.run(
        {
          listId: "list-1",
          taskId: "task-1",
          checklistItemId: "bogus",
          displayName: "x",
        },
        { fetch },
      ),
    ).rejects.toThrow(/moves to another list/);
  });
});
