import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getPageDefinition from "../scripts/getPage.ts";

const { outputSchema } = getPageDefinition;

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

describe("getPage: run", () => {
  it("GETs /pages/{pageId}/microsoft.graph.sitePage and returns the parsed page", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "page1",
        title: "Home",
        pageLayout: "home",
        webUrl: "https://contoso.sharepoint.com/sites/x/SitePages/home.aspx",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await getPageDefinition.run(
      { siteId: "site123", pageId: "page1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    // The cast segment sits after the pageId, not on the collection.
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site123/pages/page1/microsoft.graph.sitePage",
    );
    expect(calls[0]?.init?.method).toBeUndefined();
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe("page1");
  });

  it("throws a ConnectorHttpError carrying the status on a 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getPageDefinition
      .run({ siteId: "site123", pageId: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
