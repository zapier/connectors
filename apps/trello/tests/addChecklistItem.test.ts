import { describe, expect, it } from "vitest";

import addChecklistItem from "../scripts/addChecklistItem.ts";

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

const CANNED = {
  id: "507f1f77bcf86cd799439014",
  name: "New item",
  state: "incomplete",
} as const;

describe("addChecklistItem: run", () => {
  it("POSTs a checklist item and returns it", async () => {
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

    const input = addChecklistItem.inputSchema.parse({
      id: "507f1f77bcf86cd799439013",
      name: "New item",
    });
    const { data: result } = await addChecklistItem.run(input, {
      fetch: fakeFetch,
    });

    const call = calls[0]!;
    expect(call.init?.method ?? "GET").toBe("POST");
    expect(call.url).toContain("/checklists/");
    expect(call.url).toContain("/checkItems");
    expect(addChecklistItem.outputSchema.safeParse(result).success).toBe(true);
  });
});
