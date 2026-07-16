import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import queryDataSourceDefinition from "../skills/notion/scripts/queryDataSource.ts";

const { inputSchema, outputSchema } = queryDataSourceDefinition;

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

const LIST = {
  object: "list",
  results: [
    {
      object: "page",
      id: "p1111111-2222-3333-4444-555566667777",
      url: "https://www.notion.so/Row-p1111111222233334444555566667777",
      parent: { type: "data_source_id", data_source_id: "ds-1" },
    },
  ],
  has_more: false,
  next_cursor: null,
};

describe("queryDataSource: inputSchema", () => {
  it("requires data_source_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ data_source_id: "abc" }).success).toBe(true);
  });

  it("accepts optional filter / sorts / pagination", () => {
    expect(
      inputSchema.safeParse({
        data_source_id: "abc",
        filter: { property: "Status", select: { equals: "Done" } },
        sorts: [{ property: "Name", direction: "ascending" }],
        page_size: 50,
        start_cursor: "cursor-1",
      }).success,
    ).toBe(true);
  });
});

describe("queryDataSource: governance", () => {
  it("is read-only despite being a POST", () => {
    expect(queryDataSourceDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("queryDataSource: run", () => {
  it("POSTs to /v1/data_sources/{id}/query, applies the default page_size, and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(LIST);
    }) as typeof globalThis.fetch;

    const { data: result } = await queryDataSourceDefinition.run(
      { data_source_id: "2f0e1d2c-3b4a-5968-7766-554433221100" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/data_sources/2f0e1d2c-3b4a-5968-7766-554433221100/query",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    // page_size defaults to 10 when omitted (body default-limit).
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      page_size: 10,
    });
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect((calls[0]?.init?.headers as Headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results).toHaveLength(1);
  });

  it("normalizes a pasted Notion URL to a dashed UUID in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(LIST);
    }) as typeof globalThis.fetch;

    await queryDataSourceDefinition.run(
      {
        data_source_id:
          "https://www.notion.so/My-DS-2f0e1d2c3b4a59687766554433221100",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/data_sources/2f0e1d2c-3b4a-5968-7766-554433221100/query",
    );
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          object: "error",
          code: "object_not_found",
          message: "Could not find data source",
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await queryDataSourceDefinition
      .run({ data_source_id: "abc" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
