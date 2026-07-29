import { describe, expect, it } from "vitest";

import deleteListDefinition from "../scripts/deleteList.ts";

function emptyResponse(init: { status?: number } = {}): Response {
  const status = init.status ?? 204;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "No Content" : "Error",
    headers: new Headers(),
    text: async () => "",
    json: async () => {
      throw new Error("no body");
    },
  } as unknown as Response;
}

describe("deleteList: run", () => {
  it("DELETEs /me/todo/lists/{listId} and synthesizes success on a 204 no-body response", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return emptyResponse();
    }) as typeof globalThis.fetch;

    const { data } = await deleteListDefinition.run(
      { listId: "list-1" },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(data).toEqual({ success: true });
  });

  it("throws a mapped error when deleting a built-in list", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        headers: new Headers(),
        text: async () =>
          JSON.stringify({
            error: {
              code: "ErrorInvalidRequest",
              message: "Cannot delete a well-known list",
            },
          }),
      }) as unknown as Response) as typeof globalThis.fetch;

    await expect(
      deleteListDefinition.run({ listId: "Tasks" }, { fetch }),
    ).rejects.toThrow(/Cannot delete a well-known list/);
  });
});
