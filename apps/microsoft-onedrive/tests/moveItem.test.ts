import { describe, expect, it } from "vitest";

import moveItemDefinition from "../scripts/moveItem.ts";

const { outputSchema } = moveItemDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

const ITEM = { id: "01ITEM", name: "renamed.docx" };

describe("moveItem: run", () => {
  it("PATCHes both parentReference.id and name when moving + renaming", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(ITEM);
    }) as typeof globalThis.fetch;

    const { data } = await moveItemDefinition.run(
      { itemId: "01ITEM", parentItemId: "01DEST", newName: "renamed.docx" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(`${GRAPH}/me/drive/items/01ITEM`);
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      parentReference: { id: "01DEST" },
      name: "renamed.docx",
    });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("sends only name on a rename-only call (no parentReference)", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(ITEM);
    }) as typeof globalThis.fetch;

    await moveItemDefinition.run(
      { itemId: "01ITEM", newName: "renamed.docx" },
      { fetch: fakeFetch },
    );

    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      name: "renamed.docx",
    });
  });

  it("targets an explicit driveId", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse(ITEM);
    }) as typeof globalThis.fetch;

    await moveItemDefinition.run(
      { itemId: "01ITEM", driveId: "drive-9", parentItemId: "01DEST" },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toBe(`${GRAPH}/drives/drive-9/items/01ITEM`);
  });
});
