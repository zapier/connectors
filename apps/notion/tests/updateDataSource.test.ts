import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateDataSourceDefinition from "../skills/notion/scripts/updateDataSource.ts";

const { inputSchema, outputSchema } = updateDataSourceDefinition;

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
  properties: { Name: { id: "title", title: {} } },
};

describe("updateDataSource: inputSchema", () => {
  it("requires data_source_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ data_source_id: "abc" }).success).toBe(true);
  });

  it("accepts the documented update fields", () => {
    expect(
      inputSchema.safeParse({
        data_source_id: "abc",
        title: [{ text: { content: "Renamed" } }],
        properties: { Status: { select: { options: [] } } },
      }).success,
    ).toBe(true);
  });
});

describe("updateDataSource: governance", () => {
  it("is a write (not read-only)", () => {
    expect(updateDataSourceDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("updateDataSource: run", () => {
  it("PATCHes /v1/data_sources/{id} with the passed fields and returns the parsed data source", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(DATA_SOURCE);
    }) as typeof globalThis.fetch;

    const { data: result } = await updateDataSourceDefinition.run(
      {
        data_source_id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
        properties: { Status: { select: { options: [] } } },
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/data_sources/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      properties: { Status: { select: { options: [] } } },
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(DATA_SOURCE.id);
  });

  it("normalizes a pasted Notion URL to a dashed UUID in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(DATA_SOURCE);
    }) as typeof globalThis.fetch;

    await updateDataSourceDefinition.run(
      {
        data_source_id:
          "https://www.notion.so/My-DS-1429989fe8ac4effbc8f57f56486db54",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/data_sources/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { object: "error", code: "object_not_found", message: "not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await updateDataSourceDefinition
      .run({ data_source_id: "abc" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
