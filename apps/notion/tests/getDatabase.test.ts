import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getDatabaseDefinition from "../skills/notion/scripts/getDatabase.ts";

const { inputSchema, outputSchema } = getDatabaseDefinition;

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

const DATABASE = {
  object: "database",
  id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
  data_sources: [{ id: "ds", name: "X" }],
};

describe("getDatabase: inputSchema", () => {
  it("requires database_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ database_id: "abc" }).success).toBe(true);
  });
});

describe("getDatabase: governance", () => {
  it("is read-only", () => {
    expect(getDatabaseDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getDatabase: run", () => {
  it("GETs /v1/databases/{id} and returns the parsed database", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(DATABASE);
    }) as typeof globalThis.fetch;

    const { data: result } = await getDatabaseDefinition.run(
      { database_id: "1429989f-e8ac-4eff-bc8f-57f56486db54" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/databases/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.data_sources[0]?.id).toBe("ds");
  });

  it("normalizes a pasted Notion URL to a dashed UUID in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(DATABASE);
    }) as typeof globalThis.fetch;

    await getDatabaseDefinition.run(
      {
        database_id: "https://www.notion.so/X-1429989fe8ac4effbc8f57f56486db54",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/databases/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
  });

  it("throws a ConnectorHttpError on 404 (not found / not shared)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          object: "error",
          code: "object_not_found",
          message: "Could not find database",
        },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getDatabaseDefinition
      .run({ database_id: "abc" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
