import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createListItemDefinition from "../scripts/createListItem.ts";

const { outputSchema } = createListItemDefinition;

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

const createdItem = {
  id: "99",
  webUrl: "https://contoso.sharepoint.com/sites/x/Lists/L/99",
  fields: { Title: "New", Tags: ["a", "b"] },
};

describe("createListItem: run", () => {
  it("POSTs to /items with the fields wrapped in { fields } and injects the multi-value marker for arrays only", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(createdItem);
    }) as typeof globalThis.fetch;

    const { data } = await createListItemDefinition.run(
      {
        siteId: "site-1",
        listId: "list-1",
        fields: { Title: "New", Tags: ["a", "b"] },
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/lists/list-1/items",
    );
    expect(calls[0]?.init?.method).toBe("POST");

    // Body is wrapped as { fields: {...} }.
    const body = JSON.parse(calls[0]?.init?.body as string) as {
      fields: Record<string, unknown>;
    };
    expect(body.fields).toEqual({
      Title: "New",
      Tags: ["a", "b"],
      // Array-valued field gets the Collection(Edm.String) sibling marker.
      "Tags@odata.type": "Collection(Edm.String)",
    });
    // The scalar field does NOT get a marker.
    expect(body.fields).not.toHaveProperty("Title@odata.type");

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.id).toBe("99");
  });

  it("throws a ConnectorHttpError carrying the status on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "no such list" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await createListItemDefinition
      .run(
        { siteId: "site-1", listId: "list-1", fields: { Title: "x" } },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
