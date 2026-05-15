/**
 * Unit tests for `apps/notion/index.ts` — the single bundled public
 * surface (`@zapier-agent-tools/notion`).
 *
 * Asserts:
 *   - Both call shapes from the ticket compile and execute:
 *       `import notion from "@zapier-agent-tools/notion"; notion.search(...)`
 *       `import { search } from "@zapier-agent-tools/notion"; search(...)`
 *   - Each bundled script is callable AND carries the full `Script`
 *     property surface (`tool`, `inputSchema`, `outputSchema`,
 *     `connections`, `run`, `resolveContext`).
 *   - The default object's keys match the named exports (no drift).
 *   - The default-callable form delegates to `script.run(context, input)`
 *     after building the context from `process.env` — auto-discriminating
 *     against the env bag the same way the explicit path does.
 *
 * Per-script HTTP-shape coverage stays in `tests/search.test.ts`,
 * `tests/create-database-item.test.ts`, and `tests/copy-page.test.ts`;
 * this file only covers the bundle wiring.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import notion, { search, createDatabaseItem, copyPage } from "../index.ts";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_NOTION_TOKEN = process.env.NOTION_TOKEN;

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  if (ORIGINAL_NOTION_TOKEN === undefined) delete process.env.NOTION_TOKEN;
  else process.env.NOTION_TOKEN = ORIGINAL_NOTION_TOKEN;
});

describe("bundle: shape", () => {
  it("default export's keys match the named exports", () => {
    expect(Object.keys(notion).sort()).toEqual(
      ["copyPage", "createDatabaseItem", "search"].sort(),
    );
    expect(notion.search).toBe(search);
    expect(notion.createDatabaseItem).toBe(createDatabaseItem);
    expect(notion.copyPage).toBe(copyPage);
  });

  it("each bundled script is callable AND carries the full Script surface", () => {
    for (const script of [
      notion.search,
      notion.createDatabaseItem,
      notion.copyPage,
    ]) {
      expect(typeof script).toBe("function");
      expect(typeof script.run).toBe("function");
      expect(typeof script.resolveContext).toBe("function");
      expect(script.tool).toBeDefined();
      expect(typeof script.tool.name).toBe("string");
      expect(script.inputSchema).toBeDefined();
      expect(script.outputSchema).toBeDefined();
      expect(script.connections).toBeDefined();
    }
  });

  it("preserves each script's literal `tool.name`", () => {
    expect(notion.search.tool.name).toBe("search");
    expect(notion.createDatabaseItem.tool.name).toBe("create_database_item");
    expect(notion.copyPage.tool.name).toBe("copy_page");
  });
});

describe("bundle: callable form (the ticket's example)", () => {
  beforeEach(() => {
    // Each callable invocation walks `script.connections.default.securitySchemes`
    // against the env bag. Both Notion single-conn scripts declare an
    // `apiKey` scheme reading `NOTION_TOKEN` plus the framework-synthesized
    // `zapier` scheme (from `appKey: "notion"`) reading
    // `NOTION_ZAPIER_CONNECTION_ID`. Exposing only `NOTION_TOKEN` keeps the
    // test path predictable (apiKey wins by insertion order).
    process.env.NOTION_TOKEN = "secret_test_token";
  });

  it("`notion.search({ query: ... })` runs the tool against process.env", async () => {
    let capturedUrl: string | undefined;
    let capturedAuth: string | undefined;
    globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ): Promise<Response> => {
      capturedUrl = url;
      capturedAuth = (init?.headers as Record<string, string>)?.Authorization;
      return jsonResponse({
        results: [{ id: "abc" }],
        next_cursor: null,
        has_more: false,
      });
    }) as typeof globalThis.fetch;

    const result = await notion.search({ query: "Q4 planning" });

    expect(capturedUrl).toBe("https://api.notion.com/v1/search");
    expect(capturedAuth).toBe("Bearer secret_test_token");
    expect(result.results).toHaveLength(1);
  });

  it("`search(input)` (named import) is the same callable as `notion.search(input)`", async () => {
    expect(search).toBe(notion.search);

    globalThis.fetch = (async () =>
      jsonResponse({
        results: [],
        next_cursor: null,
        has_more: false,
      })) as typeof globalThis.fetch;

    const a = await search({ query: "x" });
    const b = await notion.search({ query: "x" });
    expect(a).toEqual(b);
  });

  it("`script(input, { connection })` honors an explicit ConnectionValue (overrides process.env)", async () => {
    let capturedAuth: string | undefined;
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      capturedAuth = (init?.headers as Record<string, string>)?.Authorization;
      return jsonResponse({
        results: [],
        next_cursor: null,
        has_more: false,
      });
    }) as typeof globalThis.fetch;

    await notion.search(
      { query: "x" },
      { connection: { apiKey: { NOTION_TOKEN: "explicit-override-token" } } },
    );

    expect(capturedAuth).toBe("Bearer explicit-override-token");
  });

  it("`script(input)` and `script.run(await resolveContext({ connection: process.env }), input)` produce the same result", async () => {
    globalThis.fetch = (async () =>
      jsonResponse({
        results: [{ id: "same" }],
        next_cursor: null,
        has_more: false,
      })) as typeof globalThis.fetch;

    const callable = await notion.search({ query: "same" });
    const context = await notion.search.resolveContext({
      connection: process.env,
    });
    const explicit = await notion.search.run(context, { query: "same" });
    expect(callable).toEqual(explicit);
  });
});
