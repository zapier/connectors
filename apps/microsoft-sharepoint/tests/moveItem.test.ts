import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import moveItemDefinition from "../scripts/moveItem.ts";

const { outputSchema } = moveItemDefinition;

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

const movedBody = {
  id: "01ITEM",
  name: "renamed.docx",
  parentReference: { id: "01DEST" },
};

describe("moveItem: run", () => {
  it("PATCHes the item and maps parentItemId -> parentReference.id and newName -> name", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(movedBody);
    }) as typeof globalThis.fetch;

    const { data } = await moveItemDefinition.run(
      {
        siteId: "site-1",
        itemId: "01ITEM",
        parentItemId: "01DEST",
        newName: "renamed.docx",
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drive/items/01ITEM",
    );
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
      return jsonResponse(movedBody);
    }) as typeof globalThis.fetch;

    await moveItemDefinition.run(
      { siteId: "s", itemId: "01ITEM", newName: "new.docx" },
      { fetch: fakeFetch },
    );

    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      name: "new.docx",
    });
  });

  it("sends only parentReference on a move-only call (no name)", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(movedBody);
    }) as typeof globalThis.fetch;

    await moveItemDefinition.run(
      {
        siteId: "s",
        driveId: "drive-9",
        itemId: "01ITEM",
        parentItemId: "01DEST",
      },
      { fetch: fakeFetch },
    );

    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      parentReference: { id: "01DEST" },
    });
  });

  it("targets an explicit driveId path", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse(movedBody);
    }) as typeof globalThis.fetch;

    await moveItemDefinition.run(
      { siteId: "s", driveId: "drive-9", itemId: "01ITEM", newName: "z" },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toBe(
      "https://graph.microsoft.com/v1.0/sites/s/drives/drive-9/items/01ITEM",
    );
  });

  it("throws a ConnectorHttpError on a 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "gone" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await moveItemDefinition
      .run(
        { siteId: "s", itemId: "01ITEM", newName: "z" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
