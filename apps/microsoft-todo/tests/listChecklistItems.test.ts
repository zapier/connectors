import { describe, expect, it } from "vitest";

import listChecklistItemsDefinition from "../scripts/listChecklistItems.ts";

const { inputSchema, outputSchema } = listChecklistItemsDefinition;

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

describe("listChecklistItems: run", () => {
  it("GETs the checklistItems collection with the default $top and unwraps the envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [{ id: "step-1", displayName: "Buy eggs", isChecked: false }],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks/task-1/checklistItems?$skiptoken=next1",
      });
    }) as typeof globalThis.fetch;

    const { data } = await listChecklistItemsDefinition.run(
      inputSchema.parse({ listId: "list-1", taskId: "task-1" }),
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks/task-1/checklistItems?%24top=20",
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.next_cursor).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks/task-1/checklistItems?$skiptoken=next1",
    );
  });

  it("refetches a given cursor verbatim instead of rebuilding the query", async () => {
    const calls: Array<{ url: string }> = [];
    const fetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;
    const cursor =
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1/tasks/task-1/checklistItems?$skiptoken=next1";

    await listChecklistItemsDefinition.run(
      inputSchema.parse({ listId: "list-1", taskId: "task-1", cursor }),
      { fetch },
    );

    expect(calls[0]?.url).toBe(cursor);
  });

  it("throws a mapped error on a malformed task id", async () => {
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
      listChecklistItemsDefinition.run(
        inputSchema.parse({ listId: "list-1", taskId: "bogus" }),
        { fetch },
      ),
    ).rejects.toThrow(/moves to another list/);
  });
});
