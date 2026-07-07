import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getSiteDefinition from "../scripts/getSite.ts";

const { outputSchema } = getSiteDefinition;

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

describe("getSite: run", () => {
  it("GETs /sites/{id} and returns the parsed site (single object, not a list)", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "contoso,guid1,guid2",
        displayName: "Marketing",
        webUrl: "https://contoso.sharepoint.com/sites/marketing",
        siteCollection: { hostname: "contoso.sharepoint.com" },
      });
    }) as typeof globalThis.fetch;

    const { data } = await getSiteDefinition.run(
      { siteId: "root" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://graph.microsoft.com/v1.0/sites/root");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");
    expect(data.id).toBe("contoso,guid1,guid2");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("URL-encodes a hostname:/server-relative-path site address", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ id: "s" });
    }) as typeof globalThis.fetch;

    await getSiteDefinition.run(
      { siteId: "contoso.sharepoint.com:/sites/marketing" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/contoso.sharepoint.com%3A%2Fsites%2Fmarketing",
    );
  });

  it("throws a ConnectorHttpError carrying the status on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "no" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getSiteDefinition
      .run({ siteId: "bad" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
