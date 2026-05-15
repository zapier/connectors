/**
 * Unit tests for `scripts/search.ts` — the bundled `Script` default export.
 * Covers the script body only; the `runCli(import.meta, script)` call at the
 * bottom of `search.ts` is exercised by integration evals (and unit-tested
 * for IO orchestration in `packages/zapier-skills/src/run-cli.test.ts`).
 *
 * Strategy: pass a fake `fetch` into `search.execute` (Connection shape 1),
 * assert (a) the request the script issues, (b) how it handles success /
 * error responses, and (c) that the bundled fields (`inputSchema`,
 * `outputSchema`, `tool`, `buildFetch`) match the agent-tools contract.
 */
import { describe, expect, it } from "vitest";
import search from "../scripts/search.ts";

const { inputSchema, outputSchema, tool, buildFetch, execute } = search;

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

describe("search.ts: inputSchema", () => {
  it("accepts a minimal valid input", () => {
    expect(inputSchema.safeParse({ query: "Q4 planning" }).success).toBe(true);
  });

  it("accepts the documented filter shape", () => {
    expect(
      inputSchema.safeParse({
        query: "Projects",
        filter: { property: "object", value: "database" },
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown filter value", () => {
    expect(
      inputSchema.safeParse({
        query: "Projects",
        filter: { property: "object", value: "user" },
      }).success,
    ).toBe(false);
  });

  it("rejects page_size outside Notion's accepted range", () => {
    expect(inputSchema.safeParse({ query: "x", page_size: 0 }).success).toBe(
      false,
    );
    expect(inputSchema.safeParse({ query: "x", page_size: 101 }).success).toBe(
      false,
    );
    expect(inputSchema.safeParse({ query: "x", page_size: 50 }).success).toBe(
      true,
    );
  });
});

describe("search.ts: tool descriptor", () => {
  it("declares the literal MCP Tool fields used by registrars", () => {
    expect(tool.name).toBe("search");
    expect(tool.title).toBe("Search Notion");
    expect(typeof tool.description).toBe("string");
    expect(tool.inputSchema).toBeDefined();
    expect(tool.outputSchema).toBeDefined();
  });

  it("flags itself as read-only via MCP annotations", () => {
    expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(tool.annotations?.destructiveHint).toBe(false);
    expect(tool.annotations?.idempotentHint).toBe(true);
  });

  it('co-locates governance metadata under `_meta["zapier:statements"]`', () => {
    const statements = (
      tool._meta as {
        "zapier:statements"?: ReadonlyArray<{
          effect: string;
          resources: string[];
        }>;
      }
    )?.["zapier:statements"];
    expect(Array.isArray(statements)).toBe(true);
    expect(statements?.length).toBeGreaterThan(0);
    expect(statements?.[0]?.effect).toBe("allow");
    expect(statements?.[0]?.resources).toContain("http");
  });

  it("uses Zod-derived JSON Schemas for the wire shape", () => {
    expect(JSON.stringify(tool.inputSchema)).toContain("query");
    expect(JSON.stringify(tool.outputSchema)).toContain("results");
  });
});

describe("search.ts: buildFetch", () => {
  it("only adds the Authorization header — protocol headers are execute()'s job", async () => {
    let captured: Parameters<typeof globalThis.fetch>[1] | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      captured = init;
      return jsonResponse({ ok: true });
    }) as typeof globalThis.fetch;
    try {
      const f = await buildFetch!({ NOTION_TOKEN: "secret_test_token" });
      await f("https://api.notion.com/v1/search", {
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

  it("preserves caller-provided headers when merging", async () => {
    let captured: Parameters<typeof globalThis.fetch>[1] | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      captured = init;
      return jsonResponse({ ok: true });
    }) as typeof globalThis.fetch;
    try {
      const f = await buildFetch!({ NOTION_TOKEN: "tok" });
      await f("https://api.notion.com/v1/search", {
        method: "POST",
        headers: { "X-Request-Id": "abc" },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
    const headers = captured?.headers as Record<string, string>;
    expect(headers["X-Request-Id"]).toBe("abc");
    expect(headers.Authorization).toBe("Bearer tok");
  });
});

describe("search.ts: execute", () => {
  it("POSTs the validated input to /v1/search and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        results: [{ id: "abc", object: "page" }],
        has_more: false,
        next_cursor: null,
      });
    }) as typeof globalThis.fetch;

    const result = await execute({ query: "Q4 planning" }, fakeFetch);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://api.notion.com/v1/search");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual({
      query: "Q4 planning",
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.results).toHaveLength(1);
  });

  it("sets `Notion-Version` and `Content-Type` on the request — they're protocol concerns, not auth", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ results: [], has_more: false, next_cursor: null });
    }) as typeof globalThis.fetch;

    await execute({ query: "x" }, fakeFetch);

    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers["Notion-Version"]).toBe("2022-06-28");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("throws a tagged error including the response status on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { object: "error", code: "validation_error", message: "bad query" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    await expect(execute({ query: "x" }, fakeFetch)).rejects.toThrow(
      /Notion search 400/,
    );
  });
});
