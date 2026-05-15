/**
 * Unit tests for `scripts/copy-page.ts` — the canonical multi-connection
 * example. Two slots (`source` + `target`), each declared via the
 * `securityScheme: "notion"` shorthand. Both slots resolve to their own
 * Zapier-relayed scheme on the `notion` appKey, with per-slot env-prefix
 * routing (`SOURCE_NOTION_ZAPIER_CONNECTION_ID` / `TARGET_NOTION_ZAPIER_CONNECTION_ID`).
 *
 * Strategy: build a ctx via `copyPage.resolveCtx({ connections: { source:
 * <Fetch>, target: <Fetch> } })`, then either call `copyPage.run(ctx, input)`
 * or the callable `copyPage(input, { connections })`. Assertions:
 *
 *   - `script.connections` has both slots with synthesized Zapier schemes
 *     and the expected env prefixes (`SOURCE_` / `TARGET_`).
 *   - The `source` fetch is hit for GET /v1/pages/{id} and the `target`
 *     fetch is hit for POST /v1/pages — slot isolation works.
 *   - Single-conn `callerConfig` against this multi-conn script throws
 *     with a useful migration message.
 */
import { describe, expect, it } from "vitest";
import copyPage from "../scripts/copy-page.ts";

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

describe("copy-page.ts: tool descriptor", () => {
  it("declares the literal MCP Tool fields", () => {
    expect(copyPage.tool.name).toBe("copy_page");
    expect(copyPage.tool.title).toMatch(/Copy/);
    expect(typeof copyPage.tool.description).toBe("string");
  });

  it('flags itself as a write via `effect: "ask"`', () => {
    const statements = (
      copyPage.tool._meta as {
        "zapier:statements"?: ReadonlyArray<{ effect: string }>;
      }
    )?.["zapier:statements"];
    expect(statements?.[0]?.effect).toBe("ask");
  });
});

describe("copy-page.ts: connections shape (multi-slot)", () => {
  it("declares both slots with the expected envPrefix", () => {
    expect(Object.keys(copyPage.connections).sort()).toEqual([
      "source",
      "target",
    ]);
    expect(copyPage.connections.source!.envPrefix).toBe("SOURCE_");
    expect(copyPage.connections.target!.envPrefix).toBe("TARGET_");
  });

  it("synthesizes a Zapier scheme on each slot from the string shorthand", () => {
    for (const slotName of ["source", "target"] as const) {
      const schemes = copyPage.connections[slotName]!.securitySchemes;
      expect(Object.keys(schemes)).toEqual(["default"]);
      const def = schemes.default!;
      expect(def.appKey).toBe("notion");
      expect(def.env).toEqual(["NOTION_ZAPIER_CONNECTION_ID"]);
    }
  });
});

describe("copy-page.ts: run with separate source/target fetches", () => {
  it("reads from `source`, writes to `target`, and never mixes the two", async () => {
    const sourceCalls: string[] = [];
    const targetCalls: Array<{ url: string; body: string | undefined }> = [];
    const sourceFetch: typeof globalThis.fetch = (async (
      url: string,
    ): Promise<Response> => {
      sourceCalls.push(url);
      return jsonResponse({
        properties: { Name: { title: [{ text: { content: "Doc A" } }] } },
      });
    }) as typeof globalThis.fetch;
    const targetFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ): Promise<Response> => {
      targetCalls.push({ url, body: init?.body as string | undefined });
      return jsonResponse({
        object: "page",
        id: "new-page-id",
        url: "https://www.notion.so/new-page-id",
      });
    }) as typeof globalThis.fetch;

    const result = await copyPage(
      {
        sourcePageId: "src-page-uuid",
        targetParentPageId: "tgt-parent-uuid",
      },
      {
        connections: { source: sourceFetch, target: targetFetch },
      },
    );

    expect(sourceCalls).toEqual([
      "https://api.notion.com/v1/pages/src-page-uuid",
    ]);
    expect(targetCalls).toHaveLength(1);
    expect(targetCalls[0]!.url).toBe("https://api.notion.com/v1/pages");
    const sent = JSON.parse(targetCalls[0]!.body!) as {
      parent: { type: string; page_id: string };
      properties: Record<string, unknown>;
    };
    expect(sent.parent).toEqual({
      type: "page_id",
      page_id: "tgt-parent-uuid",
    });
    expect(sent.properties.Name).toBeDefined();

    expect(result.id).toBe("new-page-id");
  });

  it("rejects single-conn callerConfig with a migration message", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({})) as typeof globalThis.fetch;
    await expect(
      // The script declares `connections: { source, target }` — calling it
      // with a single-slot `{ connection: ... }` is an author/caller bug.
      copyPage(
        {
          sourcePageId: "a",
          targetParentPageId: "b",
        },
        { connection: fakeFetch },
      ),
    ).rejects.toThrow(/multi-connection/);
  });

  it("rejects callerConfig missing a slot", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({})) as typeof globalThis.fetch;
    await expect(
      copyPage(
        {
          sourcePageId: "a",
          targetParentPageId: "b",
        },
        { connections: { source: fakeFetch } },
      ),
    ).rejects.toThrow(/missing connections for slot.*target/);
  });
});

describe("copy-page.ts: build-once via resolveCtx", () => {
  it("`copyPage.run(ctx, input)` reuses a prebuilt ctx across requests", async () => {
    let sourceHits = 0;
    let targetHits = 0;
    const sourceFetch: typeof globalThis.fetch =
      (async (): Promise<Response> => {
        sourceHits += 1;
        return jsonResponse({ properties: {} });
      }) as typeof globalThis.fetch;
    const targetFetch: typeof globalThis.fetch =
      (async (): Promise<Response> => {
        targetHits += 1;
        return jsonResponse({
          object: "page",
          id: `id-${targetHits}`,
          url: "x",
        });
      }) as typeof globalThis.fetch;

    const ctx = await copyPage.resolveCtx({
      connections: { source: sourceFetch, target: targetFetch },
    });

    await copyPage.run(ctx, { sourcePageId: "a", targetParentPageId: "b" });
    await copyPage.run(ctx, { sourcePageId: "c", targetParentPageId: "d" });

    expect(sourceHits).toBe(2);
    expect(targetHits).toBe(2);
  });
});
