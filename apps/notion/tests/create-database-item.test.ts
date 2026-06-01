import { describe, expect, it } from "vitest";

import createDatabaseItemDefinition from "../scripts/create-database-item.ts";

const { inputSchema, outputSchema } = createDatabaseItemDefinition;

const PROJECTS_DB_UUID = "12345678-1234-1234-1234-123456789abc";

function jsonResponse(
  body: unknown,
  init: { status?: number; ok?: boolean } = {},
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("create-database-item: inputSchema", () => {
  it("accepts the documented input envelope", () => {
    expect(
      inputSchema.safeParse({
        databaseId: PROJECTS_DB_UUID,
        properties: {
          Title: { title: [{ text: { content: "Website redesign" } }] },
          Status: { select: { name: "In progress" } },
        },
      }).success,
    ).toBe(true);
  });

  it("requires databaseId and properties", () => {
    expect(inputSchema.safeParse({ properties: {} }).success).toBe(false);
    expect(
      inputSchema.safeParse({ databaseId: PROJECTS_DB_UUID }).success,
    ).toBe(false);
  });
});

describe("create-database-item: run", () => {
  it("wraps the input in Notion's `parent` envelope and POSTs to /v1/pages", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        object: "page",
        id: "new-page-id",
        created_time: "2026-05-13T10:00:00.000Z",
        last_edited_time: "2026-05-13T10:00:00.000Z",
        parent: { type: "database_id", database_id: PROJECTS_DB_UUID },
        properties: {},
        url: "https://www.notion.so/new-page-id",
      });
    }) as typeof globalThis.fetch;

    const result = await createDatabaseItemDefinition.run(
      {
        databaseId: PROJECTS_DB_UUID,
        properties: {
          Title: { title: [{ text: { content: "Website redesign" } }] },
          Status: { select: { name: "In progress" } },
        },
      },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.notion.com/v1/pages");
    expect(calls[0]?.init?.method).toBe("POST");

    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      parent: { type: string; database_id: string };
      properties: Record<string, unknown>;
    };
    expect(sent.parent).toEqual({
      type: "database_id",
      database_id: PROJECTS_DB_UUID,
    });
    expect(sent.properties.Title).toEqual({
      title: [{ text: { content: "Website redesign" } }],
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("sets Notion-Version and Content-Type on the request", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({
        object: "page",
        id: "x",
        created_time: "2026-05-13T10:00:00.000Z",
        last_edited_time: "2026-05-13T10:00:00.000Z",
        parent: { type: "database_id", database_id: PROJECTS_DB_UUID },
        properties: {},
        url: "https://www.notion.so/x",
      });
    }) as typeof globalThis.fetch;

    await createDatabaseItemDefinition.run(
      {
        databaseId: PROJECTS_DB_UUID,
        properties: { Title: { title: [{ text: { content: "x" } }] } },
      },
      { fetch: fakeFetch },
    );

    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers["Notion-Version"]).toBe("2022-06-28");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("throws a tagged error including the response status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        {
          object: "error",
          code: "validation_error",
          message: "body.properties.Status.select should be defined",
        },
        { status: 400 },
      )) as typeof globalThis.fetch;

    await expect(
      createDatabaseItemDefinition.run(
        {
          databaseId: PROJECTS_DB_UUID,
          properties: { Title: { title: [{ text: { content: "x" } }] } },
        },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow(/Notion create_database_item 400/);
  });
});
