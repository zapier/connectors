import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createDatabaseDefinition from "../skills/notion/scripts/createDatabase.ts";

const { inputSchema, outputSchema } = createDatabaseDefinition;

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
  title: [{ text: { content: "Projects" } }],
  data_sources: [{ id: "ds-1", name: "Tasks" }],
};

describe("createDatabase: inputSchema", () => {
  it("requires parent", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(
      inputSchema.safeParse({ parent: { page_id: "page-1" } }).success,
    ).toBe(true);
  });

  it("accepts the documented full shape", () => {
    expect(
      inputSchema.safeParse({
        parent: { type: "page_id", page_id: "page-1" },
        title: [{ text: { content: "Projects" } }],
        initial_data_source: { properties: { Name: { title: {} } } },
        icon: { type: "emoji", emoji: "📊" },
      }).success,
    ).toBe(true);
  });
});

describe("createDatabase: governance", () => {
  it("is a write (not read-only)", () => {
    expect(createDatabaseDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("createDatabase: run", () => {
  it("POSTs to /v1/databases with the passed fields and returns the parsed database", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(DATABASE);
    }) as typeof globalThis.fetch;

    const { data: result } = await createDatabaseDefinition.run(
      {
        parent: { type: "page_id", page_id: "page-1" },
        title: [{ text: { content: "Projects" } }],
        icon: { type: "emoji", emoji: "📊" },
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.notion.com/v1/databases");
    expect(calls[0]?.init?.method).toBe("POST");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      parent: { type: "page_id", page_id: "page-1" },
      title: [{ text: { content: "Projects" } }],
      icon: { type: "emoji", emoji: "📊" },
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(DATABASE.id);
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { object: "error", code: "validation_error", message: "bad parent" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await createDatabaseDefinition
      .run({ parent: { page_id: "page-1" } }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
