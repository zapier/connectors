import { describe, expect, it } from "vitest";

import listListsDefinition from "../scripts/listLists.ts";

const { outputSchema } = listListsDefinition;

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

const sampleList = {
  id: "list-1",
  displayName: "Tasks",
  wellknownListName: "defaultList",
  isOwner: true,
  isShared: false,
};

describe("listLists: run", () => {
  it("GETs /me/todo/lists with the default $top and unwraps the envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [sampleList],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/me/todo/lists?$skiptoken=abc123",
      });
    }) as typeof globalThis.fetch;

    const { data } = await listListsDefinition.run({}, { fetch });

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists?%24top=20",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]).toMatchObject({ id: "list-1", displayName: "Tasks" });
  });

  it("passes @odata.nextLink through verbatim as next_cursor", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        value: [],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/me/todo/lists?$top=20&$skiptoken=xyz789",
      })) as typeof globalThis.fetch;

    const { data } = await listListsDefinition.run({}, { fetch });

    expect(data.next_cursor).toBe(
      "https://graph.microsoft.com/v1.0/me/todo/lists?$top=20&$skiptoken=xyz789",
    );
  });

  it("refetches a given cursor verbatim instead of rebuilding the query", async () => {
    const calls: Array<{ url: string }> = [];
    const fetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [sampleList] });
    }) as typeof globalThis.fetch;
    const cursor =
      "https://graph.microsoft.com/v1.0/me/todo/lists?$top=20&$skiptoken=xyz789";

    await listListsDefinition.run({ cursor }, { fetch });

    expect(calls[0]?.url).toBe(cursor);
  });

  it("omits next_cursor when there is no further page", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse({ value: [sampleList] })) as typeof globalThis.fetch;

    const { data } = await listListsDefinition.run({}, { fetch });

    expect(data.next_cursor).toBeUndefined();
  });

  it("throws a mapped error on 401", async () => {
    const fetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "InvalidAuthenticationToken", message: "expired" } },
        { status: 401 },
      )) as typeof globalThis.fetch;

    await expect(listListsDefinition.run({}, { fetch })).rejects.toThrow(
      /reconnect your Microsoft To Do account/,
    );
  });
});
