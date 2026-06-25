import { describe, expect, it } from "vitest";

import findChecklistItem from "../scripts/findChecklistItem.ts";

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

const CANNED = [
  {
    id: "507f1f77bcf86cd799439014",
    name: "Task",
    state: "incomplete",
  },
] as const;

describe("findChecklistItem: run", () => {
  it("GETs checklist item search results", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      const urlStr =
        typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      calls.push({ url: urlStr, init });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const input = findChecklistItem.inputSchema.parse({
      id: "507f1f77bcf86cd799439013",
      name: "Task",
    });
    const { data: result } = await findChecklistItem.run(input, {
      fetch: fakeFetch,
    });

    expect(calls[0]!.init?.method ?? "GET").toBe("GET");
    expect(calls[0]!.url).toContain("/checklists/");
    expect(calls[0]!.url).toContain("/checkItems");
    expect(result.items).toHaveLength(1);
    expect(findChecklistItem.outputSchema.safeParse(result).success).toBe(true);
  });
});
