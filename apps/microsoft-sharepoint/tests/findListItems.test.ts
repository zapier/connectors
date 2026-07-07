import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import findListItemsDefinition from "../scripts/findListItems.ts";

const { outputSchema } = findListItemsDefinition;

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

const itemsEnvelope = {
  value: [
    { id: "1", fields: { Title: "Q3 plan" } },
    { id: "2", fields: { Title: "Q4 plan" } },
  ],
  "@odata.nextLink":
    "https://graph.microsoft.com/v1.0/sites/site-1/lists/list-1/items?%24skiptoken=OPAQUE",
};

describe("findListItems: run", () => {
  it("GETs the list's items, expands fields, and unwraps the envelope", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(itemsEnvelope);
    }) as typeof globalThis.fetch;

    const { data: result } = await findListItemsDefinition.run(
      { siteId: "site-1", listId: "list-1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = calls[0]?.url as string;
    expect(url).toContain(
      "https://graph.microsoft.com/v1.0/sites/site-1/lists/list-1/items",
    );
    // No columns -> expand fields wholesale ($ URL-encoded to %24).
    expect(decodeURIComponent(url)).toContain("$expand=fields");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");

    // Envelope { value, @odata.nextLink } -> { items, next_cursor }.
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.id).toBe("1");
    expect(result.next_cursor).toBe(itemsEnvelope["@odata.nextLink"]);
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("omits next_cursor on the last page", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({ value: [{ id: "1" }] })) as typeof globalThis.fetch;

    const { data: result } = await findListItemsDefinition.run(
      { siteId: "site-1", listId: "list-1" },
      { fetch: fakeFetch },
    );

    expect(result.items).toHaveLength(1);
    expect(result.next_cursor).toBeUndefined();
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("maps columns into $expand=fields($select=A,B)", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await findListItemsDefinition.run(
      { siteId: "site-1", listId: "list-1", columns: ["Title", "Status"] },
      { fetch: fakeFetch },
    );

    expect(decodeURIComponent(calls[0]?.url as string)).toContain(
      "$expand=fields($select=Title,Status)",
    );
  });

  it("sets the HonorNonIndexedQueries Prefer header when a filter is present", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await findListItemsDefinition.run(
      {
        siteId: "site-1",
        listId: "list-1",
        filter: "fields/Status eq 'Open'",
      },
      { fetch: fakeFetch },
    );

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("Prefer")).toBe(
      "HonorNonIndexedQueriesWarningMayFailRandomly",
    );
    // Spaces in the query string are encoded as '+' by URLSearchParams.
    expect(decodeURIComponent(calls[0]?.url as string)).toContain(
      "$filter=fields/Status+eq+'Open'",
    );
  });

  it("omits the Prefer header when no filter is present", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ value: [] });
    }) as typeof globalThis.fetch;

    await findListItemsDefinition.run(
      { siteId: "site-1", listId: "list-1" },
      { fetch: fakeFetch },
    );

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("Prefer")).toBeNull();
  });

  it("throws a ConnectorHttpError carrying the status on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await findListItemsDefinition
      .run({ siteId: "site-1", listId: "list-1" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
