import { describe, expect, it } from "vitest";

import createListDefinition from "../scripts/createList.ts";

const { outputSchema } = createListDefinition;

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

describe("createList: run", () => {
  it("POSTs displayName to /me/todo/lists", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "list-2",
        displayName: "Groceries",
        wellknownListName: "none",
      });
    }) as typeof globalThis.fetch;

    const { data } = await createListDefinition.run(
      { displayName: "Groceries" },
      { fetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      displayName: "Groceries",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("list-2");
  });

  it("throws a mapped error on a validation failure", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorInvalidRequest", message: "bad request" } },
        { status: 400 },
      )) as typeof globalThis.fetch;

    await expect(
      createListDefinition.run({ displayName: "" }, { fetch }),
    ).rejects.toThrow(/Microsoft To Do createList/);
  });
});
