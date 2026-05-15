/**
 * Unit tests for `scripts/create-database-item.ts`. Covers the literal
 * MCP `Tool` descriptor (including the dependent-fields surface via
 * `_meta["zapier:inputDependencies"]`), the per-app auth wrapper, and
 * the `run` function's request envelope. The bundled `inputDependencies`
 * is also asserted here — it's the part of the contract adapter
 * consumers read at install / register time, mirrored on both
 * `createDatabaseItem.inputDependencies` and
 * `createDatabaseItem.tool._meta["zapier:inputDependencies"]`.
 */
import { describe, expect, it } from "vitest";
import createDatabaseItem from "../scripts/create-database-item.ts";

const { inputSchema, outputSchema, tool } = createDatabaseItem;
const inputDependencies = createDatabaseItem.inputDependencies!;

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

describe("create-database-item.ts: inputSchema", () => {
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

describe("create-database-item.ts: tool descriptor", () => {
  it("declares the expected MCP Tool fields", () => {
    expect(tool.name).toBe("create_database_item");
    expect(tool.title).toMatch(/Notion/);
    expect(typeof tool.description).toBe("string");
  });

  it("flags itself as a write (non-read-only, non-idempotent)", () => {
    expect(tool.annotations?.readOnlyHint).toBe(false);
    expect(tool.annotations?.idempotentHint).toBe(false);
  });

  it('co-locates `effect: "ask"` governance via `_meta["zapier:statements"]`', () => {
    const statements = (
      tool._meta as { "zapier:statements"?: ReadonlyArray<{ effect: string }> }
    )?.["zapier:statements"];
    expect(statements?.[0]?.effect).toBe("ask");
  });

  it('mirrors `inputDependencies` into `_meta["zapier:inputDependencies"]`', () => {
    const wire = (
      tool._meta as { "zapier:inputDependencies"?: typeof inputDependencies }
    )["zapier:inputDependencies"];
    expect(wire).toBe(inputDependencies);
  });
});

describe("create-database-item.ts: inputDependencies", () => {
  it("declares `databaseId` as an options chain off list-databases", () => {
    expect(inputDependencies.databaseId.kind).toBe("options");
    expect(inputDependencies.databaseId.fromTool).toBe("list-databases");
  });

  it("declares `properties` as a schema chain off get-database-schema, parameterised by databaseId", () => {
    expect(inputDependencies.properties.kind).toBe("schema");
    expect(inputDependencies.properties.fromTool).toBe("get-database-schema");
    expect(inputDependencies.properties.fromArgs.databaseId).toBe(
      "$databaseId",
    );
  });
});

describe("create-database-item.ts: connections shape", () => {
  it("normalizes singular `connection` to `{ default: ... }` with both schemes", () => {
    expect(Object.keys(createDatabaseItem.connections)).toEqual(["default"]);
    const schemes = createDatabaseItem.connections.default!.securitySchemes;
    expect(schemes.apiKey).toBeDefined();
    expect(schemes.apiKey!.env).toEqual(["NOTION_TOKEN"]);
    expect(schemes.zapier).toBeDefined();
    expect(schemes.zapier!.appKey).toBe("notion");
  });
});

describe("create-database-item.ts: apiKey scheme's authed Fetch", () => {
  it("only adds the Authorization header — protocol headers are run()'s job", async () => {
    let captured: Parameters<typeof globalThis.fetch>[1] | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      captured = init;
      return jsonResponse({ ok: true });
    }) as typeof globalThis.fetch;
    try {
      const ctx = await createDatabaseItem.resolveCtx({
        connection: { NOTION_TOKEN: "secret_test_token" },
      });
      if (!("fetch" in ctx)) throw new Error("expected single-conn ctx");
      await ctx.fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        body: "{}",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
    const headers = captured?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret_test_token");
    expect(headers["Notion-Version"]).toBeUndefined();
    expect(headers["Content-Type"]).toBeUndefined();
  });
});

describe("create-database-item.ts: run", () => {
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

    const result = await createDatabaseItem(
      {
        databaseId: PROJECTS_DB_UUID,
        properties: {
          Title: { title: [{ text: { content: "Website redesign" } }] },
          Status: { select: { name: "In progress" } },
        },
      },
      { connection: fakeFetch },
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

  it("sets `Notion-Version` and `Content-Type` on the request — they're protocol concerns, not auth", async () => {
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

    await createDatabaseItem(
      {
        databaseId: PROJECTS_DB_UUID,
        properties: { Title: { title: [{ text: { content: "x" } }] } },
      },
      { connection: fakeFetch },
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
      createDatabaseItem(
        {
          databaseId: PROJECTS_DB_UUID,
          properties: { Title: { title: [{ text: { content: "x" } }] } },
        },
        { connection: fakeFetch },
      ),
    ).rejects.toThrow(/Notion create_database_item 400/);
  });
});

describe("create-database-item.ts: callable + .run parity", () => {
  it("`createDatabaseItem(input, { connection })` matches `.run(await resolveCtx(...), input)`", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        object: "page",
        id: "row-id",
        created_time: "2026-05-13T10:00:00.000Z",
        last_edited_time: "2026-05-13T10:00:00.000Z",
        parent: { type: "database_id", database_id: PROJECTS_DB_UUID },
        properties: {},
        url: "https://www.notion.so/row-id",
      });
    }) as typeof globalThis.fetch;

    const input = {
      databaseId: PROJECTS_DB_UUID,
      properties: { Title: { title: [{ text: { content: "x" } }] } },
    };

    const callableResult = await createDatabaseItem(input, {
      connection: fakeFetch,
    });
    const ctx = await createDatabaseItem.resolveCtx({ connection: fakeFetch });
    const explicitResult = await createDatabaseItem.run(ctx, input);

    expect(callableResult).toEqual(explicitResult);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe(calls[1]?.url);
    expect(calls[0]?.init?.body).toBe(calls[1]?.init?.body);
  });
});
