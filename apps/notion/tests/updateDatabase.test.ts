import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateDatabaseDefinition from "../skills/notion/scripts/updateDatabase.ts";

const { inputSchema, outputSchema } = updateDatabaseDefinition;

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
  title: [{ text: { content: "Renamed" } }],
  data_sources: [{ id: "ds-1", name: "Tasks" }],
};

describe("updateDatabase: inputSchema", () => {
  it("requires database_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ database_id: "abc" }).success).toBe(true);
  });

  it("accepts the documented update fields", () => {
    expect(
      inputSchema.safeParse({
        database_id: "abc",
        title: [{ text: { content: "Renamed" } }],
        icon: { type: "emoji", emoji: "📊" },
        is_inline: true,
        in_trash: false,
      }).success,
    ).toBe(true);
  });
});

describe("updateDatabase: governance", () => {
  it("is a write (not read-only)", () => {
    expect(updateDatabaseDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("updateDatabase: run", () => {
  it("PATCHes /v1/databases/{id} with the passed fields and returns the parsed database", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(DATABASE);
    }) as typeof globalThis.fetch;

    const { data: result } = await updateDatabaseDefinition.run(
      {
        database_id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
        title: [{ text: { content: "Renamed" } }],
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/databases/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect((calls[0]?.init?.headers as Headers).get("Notion-Version")).toBe(
      "2025-09-03",
    );
    expect(JSON.parse(calls[0]?.init?.body as string)).toMatchObject({
      title: [{ text: { content: "Renamed" } }],
    });
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(DATABASE.id);
  });

  it("normalizes a pasted Notion URL to a dashed UUID in the path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(DATABASE);
    }) as typeof globalThis.fetch;

    await updateDatabaseDefinition.run(
      {
        database_id:
          "https://www.notion.so/My-DB-1429989fe8ac4effbc8f57f56486db54",
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://api.notion.com/v1/databases/1429989f-e8ac-4eff-bc8f-57f56486db54",
    );
  });

  it("throws a ConnectorHttpError carrying the status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { object: "error", code: "object_not_found", message: "not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await updateDatabaseDefinition
      .run({ database_id: "abc" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
