import { describe, expect, it } from "vitest";

import updateListDefinition from "../scripts/updateList.ts";

const { outputSchema } = updateListDefinition;

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

describe("updateList: run", () => {
  it("PATCHes displayName to /me/todo/lists/{listId}", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ id: "list-1", displayName: "Renamed" });
    }) as typeof globalThis.fetch;

    const { data } = await updateListDefinition.run(
      { listId: "list-1", displayName: "Renamed" },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      displayName: "Renamed",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a mapped error when renaming a built-in list", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: "ErrorInvalidRequest",
            message: "Cannot rename a well-known list",
          },
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    await expect(
      updateListDefinition.run(
        { listId: "Tasks", displayName: "Not Allowed" },
        { fetch },
      ),
    ).rejects.toThrow(/Cannot rename a well-known list/);
  });
});
