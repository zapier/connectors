import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listListsDefinition from "../scripts/listLists.ts";

const { outputSchema } = listListsDefinition;

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

describe("listLists: run", () => {
  it("GETs the site's lists, sets $top from limit, and unwraps the envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [
          {
            id: "list-1",
            displayName: "Documents",
            list: { template: "documentLibrary" },
          },
          { id: "list-2", displayName: "Tasks", list: { template: "tasks" } },
        ],
        "@odata.nextLink": "https://graph.microsoft.com/v1.0/next-page",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listListsDefinition.run(
      { siteId: "site-123", limit: 5 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = calls[0]?.url as string;
    expect(url).toContain(
      "https://graph.microsoft.com/v1.0/sites/site-123/lists",
    );
    // OData $top is URL-encoded ($ -> %24).
    expect(url).toContain("%24top=5");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");

    // Envelope { value, @odata.nextLink } -> { items, next_cursor }.
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.id).toBe("list-1");
    expect(result.next_cursor).toBe(
      "https://graph.microsoft.com/v1.0/next-page",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("omits next_cursor on the last page", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        value: [{ id: "list-1", displayName: "Documents" }],
      })) as typeof globalThis.fetch;

    const { data: result } = await listListsDefinition.run(
      { siteId: "site-123" },
      { fetch: fakeFetch },
    );

    expect(result.items).toHaveLength(1);
    expect(result.next_cursor).toBeUndefined();
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("fetches the opaque cursor URL verbatim (not the base URL)", async () => {
    const calls: Array<{ url: string }> = [];
    const cursor =
      "https://graph.microsoft.com/v1.0/sites/site-123/lists?%24skiptoken=OPAQUE";
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await listListsDefinition.run(
      { siteId: "site-123", cursor },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(cursor);
  });

  it("throws a ConnectorHttpError carrying the status on 403", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "accessDenied", message: "denied" } },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await listListsDefinition
      .run({ siteId: "site-123" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
