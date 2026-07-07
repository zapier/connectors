import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateListItemDefinition from "../scripts/updateListItem.ts";

const { outputSchema } = updateListItemDefinition;

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

const updatedFields = { Title: "Renamed", Tags: ["x", "y"] };

describe("updateListItem: run", () => {
  it("PATCHes /items/{id}/fields with the fields object DIRECTLY and injects the multi-value marker for arrays only", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(updatedFields);
    }) as typeof globalThis.fetch;

    const { data } = await updateListItemDefinition.run(
      {
        siteId: "site-1",
        listId: "list-1",
        itemId: "42",
        fields: { Title: "Renamed", Tags: ["x", "y"] },
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    // Path ends at /items/{id}/fields.
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-1/lists/list-1/items/42/fields",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");

    // Body is the fieldValueSet DIRECTLY (not wrapped in { fields }).
    const body = JSON.parse(calls[0]?.init?.body as string) as Record<
      string,
      unknown
    >;
    expect(body).not.toHaveProperty("fields");
    expect(body).toEqual({
      Title: "Renamed",
      Tags: ["x", "y"],
      "Tags@odata.type": "Collection(Edm.String)",
    });
    expect(body).not.toHaveProperty("Title@odata.type");

    expect(outputSchema.safeParse(data).success).toBe(true);
    expect(data.Title).toBe("Renamed");
  });

  it("throws a ConnectorHttpError carrying the status on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "gone" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await updateListItemDefinition
      .run(
        {
          siteId: "site-1",
          listId: "list-1",
          itemId: "42",
          fields: { Title: "x" },
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
