import { describe, expect, it } from "vitest";

import findItemsByKqlDefinition from "../scripts/findItemsByKql.ts";

const { outputSchema } = findItemsByKqlDefinition;

const GRAPH = "https://graph.microsoft.com/v1.0";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

function searchBody(
  resources: unknown[],
  moreResultsAvailable = false,
): unknown {
  return {
    value: [
      {
        hitsContainers: [
          {
            hits: resources.map((resource) => ({ resource })),
            moreResultsAvailable,
          },
        ],
      },
    ],
  };
}

describe("findItemsByKql: run", () => {
  it("POSTs a driveItem search and unwraps the nested hits to items", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(
        searchBody([{ id: "01ITEM", name: "budget.docx" }], true),
      );
    }) as typeof globalThis.fetch;

    const { data } = await findItemsByKqlDefinition.run(
      { query: "budget", limit: 10 },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(`${GRAPH}/search/query`);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      requests: [
        {
          entityTypes: ["driveItem"],
          query: { queryString: "budget" },
          from: 0,
          size: 10,
        },
      ],
    });

    expect(data.items).toHaveLength(1);
    expect(data.next_cursor).toBe("10");
    expect(outputSchema.safeParse(data).success).toBe(true);
  });

  it("advances the offset cursor and omits next_cursor when no more results", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(searchBody([{ id: "01ITEM", name: "x" }], false));
    }) as typeof globalThis.fetch;

    const { data } = await findItemsByKqlDefinition.run(
      { query: "x", cursor: "20", limit: 5 },
      { fetch: fakeFetch },
    );

    expect(
      JSON.parse(calls[0]?.init?.body as string).requests[0],
    ).toMatchObject({ from: 20, size: 5 });
    expect(data.next_cursor).toBeUndefined();
  });

  it("returns an empty item list when there are no hits", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(searchBody([]))) as typeof globalThis.fetch;

    const { data } = await findItemsByKqlDefinition.run(
      { query: "nothing" },
      { fetch: fakeFetch },
    );

    expect(data.items).toEqual([]);
  });
});
