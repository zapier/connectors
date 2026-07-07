import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listFolderItemsDefinition from "../scripts/listFolderItems.ts";

const { outputSchema } = listFolderItemsDefinition;

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
  it("addresses the default library root, unwraps the envelope, sets $top", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [{ id: "item-1", name: "Report.docx" }],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/sites/site-1/drive/root/children?skiptoken=abc",
      });
    }) as typeof globalThis.fetch;

    const { data } = await listFolderItemsDefinition.run(
      { siteId: "site-1", limit: 10 },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drive/root/children?%24top=10",
    );
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.next_cursor).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drive/root/children?skiptoken=abc",
    );
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit driveId when supplied (default-library switch)", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await listFolderItemsDefinition.run(
      { siteId: "site-1", driveId: "drive-9" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://graph.microsoft.com/v1.0/sites/site-1/drives/drive-9/root/children",
    );
  });

  it("addresses a folder's children when itemId is supplied", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await listFolderItemsDefinition.run(
      { siteId: "site-1", itemId: "folder-7" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://graph.microsoft.com/v1.0/sites/site-1/drive/items/folder-7/children",
    );
  });

  it("throws a ConnectorHttpError carrying the status on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "no" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listFolderItemsDefinition
      .run({ siteId: "site-1", itemId: "bad" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
