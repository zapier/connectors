import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createDataSourceDefinition from "../skills/notion/scripts/createDataSource.ts";

const { inputSchema, outputSchema } = createDataSourceDefinition;

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

describe("createDataSource: inputSchema", () => {
  it("requires parent and properties", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(
      inputSchema.safeParse({ parent: { database_id: "db-1" } }).success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({ properties: { Name: { title: {} } } }).success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({
        parent: { database_id: "db-1" },
        properties: { Name: { title: {} } },
      }).success,
    ).toBe(true);
  });
});

describe("createDataSource: governance", () => {
  it("is a write (not read-only)", () => {
    expect(createDataSourceDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("createDataSource: run", () => {
  it("POSTs to /v1/data_sources with the passed fields and returns the parsed data source", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(DATA_SOURCE);
    }) as typeof globalThis.fetch;

    const { data: result } = await createDataSourceDefinition.run(
      {
        parent: { type: "database_id", database_id: "db-1" },
        title: [{ text: { content: "Tasks" } }],
        properties: { Name: { title: {} } },
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.notion.com/v1/data_sources");
    expect(calls[0]?.init?.method).toBe("POST");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      parent: { type: "database_id", database_id: "db-1" },
      title: [{ text: { content: "Tasks" } }],
      properties: { Name: { title: {} } },
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(DATA_SOURCE.id);
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { object: "error", code: "validation_error", message: "bad schema" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await createDataSourceDefinition
      .run(
        {
          parent: { database_id: "db-1" },
          properties: { Name: { title: {} } },
        },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
