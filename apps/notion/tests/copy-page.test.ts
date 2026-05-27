import { describe, expect, it } from "vitest";

import copyPageDefinition from "../scripts/copy-page.ts";

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

describe("copy-page: run", () => {
  it("reads from source, writes to target, and never mixes the two", async () => {
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

    const result = await copyPageDefinition.run(
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
});
