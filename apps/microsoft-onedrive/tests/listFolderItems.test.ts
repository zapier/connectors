import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listFolderItemsDefinition from "../scripts/listFolderItems.ts";

const { outputSchema } = listFolderItemsDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";

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

describe("listFolderItems: run", () => {
  it("addresses the own-drive root, unwraps the envelope, sets $top", async () => {
    const calls: string[] = [];
    const nextLink = `${GRAPH}/me/drive/root/children?$skiptoken=abc`;
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({
        value: [{ id: "item-1", name: "Report.docx" }],
        "@odata.nextLink": nextLink,
      });
    }) as typeof globalThis.fetch;

    const { data } = await listFolderItemsDefinition.run(
      { limit: 10 },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toBe(`${GRAPH}/me/drive/root/children?%24top=10`);
    expect(data.items).toHaveLength(1);
    expect(data.next_cursor).toBe(nextLink);
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit driveId when supplied", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await listFolderItemsDefinition.run(
      { driveId: "drive-9" },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toContain(`${GRAPH}/drives/drive-9/root/children`);
  });

  it("addresses a folder's children when itemId is supplied", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await listFolderItemsDefinition.run(
      { itemId: "folder-7" },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toContain(`${GRAPH}/me/drive/items/folder-7/children`);
  });

  it("throws a ConnectorHttpError carrying the status on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "no" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listFolderItemsDefinition
      .run({ itemId: "bad" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
