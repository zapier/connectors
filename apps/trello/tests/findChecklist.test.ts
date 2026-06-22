import { describe, expect, it } from "vitest";

import findChecklist from "../scripts/findChecklist.ts";

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
    id: "507f1f77bcf86cd799439013",
    name: "Checklist",
  },
] as const;

describe("findChecklist: run", () => {
  it("GETs checklists filtered by name", async () => {
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

    const input = findChecklist.inputSchema.parse({
      id: "5a8630538097a5ac7ab30633",
      name: "Checklist",
    });
    const { data: result } = await findChecklist.run(input, {
      fetch: fakeFetch,
    });

    expect(calls[0]!.init?.method ?? "GET").toBe("GET");
    expect(calls[0]!.url).toContain("/cards/");
    expect(calls[0]!.url).toContain("/checklists");
    expect(findChecklist.outputSchema.safeParse(result).success).toBe(true);
  });
});
