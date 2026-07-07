import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import deleteItemDefinition from "../scripts/deleteItem.ts";

const { outputSchema } = deleteItemDefinition;

/** A 204 No Content response: empty body, .json() would throw. */
function noContentResponse(): Response {
  return {
    ok: true,
    status: 204,
    statusText: "No Content",
    headers: new Headers(),
    text: async () => "",
    json: async () => {
      throw new Error("204 has no body");
    },
  } as unknown as Response;
}

function errorResponse(body: unknown, status: number): Response {
  return {
    ok: false,
    status,
    statusText: "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("deleteItem: run", () => {
  it("DELETEs the item and returns { success: true } without parsing the empty 204 body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return noContentResponse();
    }) as typeof globalThis.fetch;

    const { data } = await deleteItemDefinition.run(
      { siteId: "site-1", itemId: "01ITEM" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/drive/items/01ITEM",
    );
    expect(calls[0]?.init?.method).toBe("DELETE");
    expect(data).toEqual({ success: true });
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("targets an explicit driveId path", async () => {
    const calls: string[] = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push(url);
      return noContentResponse();
    }) as typeof globalThis.fetch;

    await deleteItemDefinition.run(
      { siteId: "s", driveId: "drive-9", itemId: "01ITEM" },
      { fetch: fakeFetch },
    );

    expect(calls[0]).toBe(
      "https://graph.microsoft.com/v1.0/sites/s/drives/drive-9/items/01ITEM",
    );
  });

  it("throws a ConnectorHttpError on a 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      errorResponse(
        { error: { code: "itemNotFound", message: "gone" } },
        404,
      )) as typeof globalThis.fetch;

    const err = await deleteItemDefinition
      .run({ siteId: "s", itemId: "01ITEM" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
