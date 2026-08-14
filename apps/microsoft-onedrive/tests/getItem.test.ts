import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getItemDefinition from "../scripts/getItem.ts";

const { outputSchema } = getItemDefinition;

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

const ITEM = {
  id: "01FILE",
  name: "report.docx",
  "@microsoft.graph.downloadUrl": "https://dl.example.com/preauth?token=xyz",
};

describe("getItem: run", () => {
  it("GETs /me/drive/items/{id} by default", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse(ITEM);
    }) as typeof globalThis.fetch;

    const { data } = await getItemDefinition.run(
      { itemId: "01FILE" },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toBe(`${GRAPH}/me/drive/items/01FILE`);
    expect(data["@microsoft.graph.downloadUrl"]).toContain("preauth");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit driveId when supplied", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return jsonResponse(ITEM);
    }) as typeof globalThis.fetch;

    await getItemDefinition.run(
      { itemId: "01FILE", driveId: "drive-9" },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toBe(`${GRAPH}/drives/drive-9/items/01FILE`);
  });

  it("throws a ConnectorHttpError on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "no" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getItemDefinition
      .run({ itemId: "bad" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
