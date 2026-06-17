import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getDataSourceDefinition from "../scripts/getDataSource.ts";

const { inputSchema, outputSchema } = getDataSourceDefinition;

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

const DATA_SOURCE = {
  object: "data_source",
  id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
  name: "Tasks",
  properties: { Name: { id: "title", type: "title" } },
};

describe("getDataSource: inputSchema", () => {
  it("requires data_source_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ data_source_id: "abc" }).success).toBe(true);
  });
});

describe("getDataSource: governance", () => {
  it("is read-only", () => {
    expect(getDataSourceDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getDataSource: run", () => {
  it("GETs /v1/data_sources/{id} and returns the parsed data source", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(DATA_SOURCE);
    }) as typeof globalThis.fetch;

    const { data: result } = await getDataSourceDefinition.run(
      { data_source_id: "1429989f-e8ac-4eff-bc8f-57f56486db54" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/data_sources/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.name).toBe("Tasks");
  });

  it("normalizes a pasted Notion URL to a dashed UUID in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(DATA_SOURCE);
    }) as typeof globalThis.fetch;

    await getDataSourceDefinition.run(
      {
        data_source_id:
          "https://www.notion.so/X-1429989fe8ac4effbc8f57f56486db54",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/data_sources/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
  });

  it("throws a ConnectorHttpError on 404 (not found / not shared)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          object: "error",
          code: "object_not_found",
          message: "Could not find data source",
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getDataSourceDefinition
      .run({ data_source_id: "abc" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
