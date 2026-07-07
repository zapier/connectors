import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listColumnsDefinition from "../scripts/listColumns.ts";

const { outputSchema } = listColumnsDefinition;

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

describe("listColumns: run", () => {
  it("GETs the list's columns, maps value -> items with no next_cursor, preserving choices and opaque facets", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        value: [
          {
            id: "col-1",
            name: "Title",
            displayName: "Title",
            required: true,
            text: { allowMultipleLines: false, maxLength: 255 },
          },
          {
            id: "col-2",
            name: "Status",
            displayName: "Status",
            choice: {
              choices: ["Open", "In Progress", "Done"],
              displayAs: "dropDownMenu",
            },
          },
        ],
        // Even if Graph were to send a nextLink, listColumns drops it.
        "@odata.nextLink": "https://graph.microsoft.com/v1.0/should-be-dropped",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await listColumnsDefinition.run(
      { siteId: "site-123", listId: "list-1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://graph.microsoft.com/v1.0/sites/site-123/lists/list-1/columns",
    );
    expect(calls[0]?.init?.method ?? "GET").toBe("GET");

    // value -> items, and NO next_cursor even though the envelope carried one.
    expect(result.items).toHaveLength(2);
    expect("next_cursor" in result).toBe(false);

    // The opaque `text` type facet survives untouched.
    expect(result.items[0]?.text).toEqual({
      allowMultipleLines: false,
      maxLength: 255,
    });

    // The choice column's `choices` survive.
    expect(result.items[1]?.choice?.choices).toEqual([
      "Open",
      "In Progress",
      "Done",
    ]);

    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws a ConnectorHttpError carrying the status on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { error: { code: "itemNotFound", message: "not found" } },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await listColumnsDefinition
      .run({ siteId: "site-123", listId: "missing" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
