import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listPagesDefinition from "../scripts/listPages.ts";

const { outputSchema } = listPagesDefinition;

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

describe("listPages: run", () => {
  it("GETs the sitePage-cast collection, sets $top from limit, and unwraps the envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [
          { id: "page1", title: "Home", pageLayout: "home" },
          { id: "page2", title: "News", pageLayout: "article" },
        ],
        "@odata.nextLink":
          "https://graph.microsoft.com/v1.0/sites/site123/pages/microsoft.graph.sitePage?$skiptoken=NEXT",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listPagesDefinition.run(
      { siteId: "site123", limit: 5 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const called = new URL(calls[0]?.url ?? "");
    expect(called.origin).toBe("https://graph.microsoft.com");
    // The required microsoft.graph.sitePage cast segment is baked into the path.
    expect(called.pathname).toBe(
      "/v1.0/sites/site123/pages/microsoft.graph.sitePage",
    );
    expect(called.searchParams.get("$top")).toBe("5");
    // List read → no method (GET default).
    expect(calls[0]?.init?.method).toBeUndefined();

    // Envelope unwrap: value → items, @odata.nextLink → next_cursor.
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.next_cursor).toBe(
      "https://graph.microsoft.com/v1.0/sites/site123/pages/microsoft.graph.sitePage?$skiptoken=NEXT",
    );
  });

  it("fetches the opaque cursor URL verbatim on a follow-up page", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    const cursor =
      "https://graph.microsoft.com/v1.0/sites/site123/pages/microsoft.graph.sitePage?$skiptoken=NEXT";
    const { data: result } = await listPagesDefinition.run(
      { siteId: "site123", cursor },
      { fetch: fakeFetch },
    );

    // The opaque nextLink is fetched as-is, not the reconstructed base URL.
    expect(calls[0]?.url).toBe(cursor);
    // Last page: no next_cursor.
    expect(result.next_cursor).toBeUndefined();
    expect(result.items).toEqual([]);
  });

  it("throws a ConnectorHttpError carrying the status on a 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "accessDenied", message: "forbidden" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listPagesDefinition
      .run({ siteId: "site123" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
