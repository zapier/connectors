import { describe, expect, it } from "vitest";

import getListDefinition from "../scripts/getList.ts";

const { outputSchema } = getListDefinition;

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

describe("getList: run", () => {
  it("GETs /me/todo/lists/{listId} and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "list-1",
        displayName: "Groceries",
        wellknownListName: "none",
        isOwner: true,
        isShared: false,
      });
    }) as typeof globalThis.fetch;

    const { data } = await getListDefinition.run(
      { listId: "list-1" },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/list-1",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.displayName).toBe("Groceries");
  });

  it("URL-encodes a listId with special characters", async () => {
    const calls: Array<{ url: string }> = [];
    const fetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ id: "a/b", displayName: "X" });
    }) as typeof globalThis.fetch;

    await getListDefinition.run({ listId: "a/b" }, { fetch });

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists/a%2Fb",
    );
  });

  it("throws a mapped error hint on 404 ErrorInvalidIdMalformed", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            code: "ErrorInvalidIdMalformed",
            message: "The list id is malformed",
          },
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    await expect(
      getListDefinition.run({ listId: "bogus" }, { fetch }),
    ).rejects.toThrow(/listId or taskId is invalid, stale, or malformed/);
  });
});
