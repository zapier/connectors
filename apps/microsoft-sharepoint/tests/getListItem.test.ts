import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getListItemDefinition from "../scripts/getListItem.ts";

const { outputSchema } = getListItemDefinition;

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

const itemBody = {
  id: "42",
  webUrl: "https://contoso.sharepoint.com/sites/x/Lists/L/42",
  fields: { Title: "Q3 plan", Status: "Open" },
};

describe("getListItem: run", () => {
  it("GETs the single item and expands fields wholesale when no columns", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(itemBody);
    }) as typeof globalThis.fetch;

    const { data } = await getListItemDefinition.run(
      { siteId: "site-1", listId: "list-1", itemId: "42" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    const url = calls[0]?.url as string;
    expect(url).toContain(
      "https://graph.microsoft.com/v1.0/sites/site-1/lists/list-1/items/42",
    );
    expect(decodeURIComponent(url)).toContain("$expand=fields");
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");

    // Returns a single list item (not an envelope).
    expect(data.id).toBe("42");
    expect(data.fields?.Title).toBe("Q3 plan");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("maps columns into $expand=fields($select=A,B)", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(itemBody);
    }) as typeof globalThis.fetch;

    await getListItemDefinition.run(
      {
        siteId: "site-1",
        listId: "list-1",
        itemId: "42",
        columns: ["Title", "Assignee"],
      },
      { fetch: fakeFetch },
    );

    expect(decodeURIComponent(calls[0]?.url as string)).toContain(
      "$expand=fields($select=Title,Assignee)",
    );
  });

  it("throws a ConnectorHttpError carrying the status on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getListItemDefinition
      .run(
        { siteId: "site-1", listId: "list-1", itemId: "42" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
