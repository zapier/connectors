import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getItemDefinition from "../scripts/getItem.ts";

const { outputSchema } = getItemDefinition;

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

describe("getItem: run", () => {
  it("GETs the default library item and returns the parsed driveItem", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "item-1",
        name: "Report.docx",
        file: { mimeType: "application/vnd.ms-word" },
        "@microsoft.graph.downloadUrl": "https://download.example/xyz",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getItemDefinition.run(
      { siteId: "site-1", itemId: "item-1" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drive/items/item-1",
    );
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(data.id).toBe("item-1");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit driveId when supplied (default-library switch)", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ id: "item-1", name: "x" });
    }) as typeof globalThis.fetch;

    await getItemDefinition.run(
      { siteId: "site-1", itemId: "item-1", driveId: "drive-9" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drives/drive-9/items/item-1",
    );
  });

  it("throws a ConnectorHttpError carrying the status on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "no" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getItemDefinition
      .run({ siteId: "site-1", itemId: "bad" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
