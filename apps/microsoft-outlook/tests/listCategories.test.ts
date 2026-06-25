import { describe, expect, it } from "vitest";

import listCategoriesDefinition from "../scripts/listCategories.ts";

const { outputSchema } = listCategoriesDefinition;

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

describe("listCategories: run", () => {
  it("GETs /me/outlook/masterCategories and unwraps the value array into items", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [{ id: "cat1", displayName: "Red category", color: "preset0" }],
      });
    }) as typeof globalThis.fetch;

    const { data } = await listCategoriesDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/outlook/masterCategories",
    );
    expect(calls[0]?.init?.method).toBeUndefined();
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(1);
    // masterCategories is not paginated — no next_cursor on the output shape.
    expect("next_cursor" in data).toBe(false);
  });

  it("returns an empty items array when the response has no value array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({})) as typeof globalThis.fetch;

    const { data } = await listCategoriesDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(0);
  });

  it("throws a tool-named Error on a 403 access-denied response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "ErrorAccessDenied", message: "denied" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listCategoriesDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(
      "Microsoft Outlook listCategories",
    );
    expect((err as Error).message).toContain("ErrorAccessDenied");
  });
});
