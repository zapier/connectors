import { describe, expect, it } from "vitest";

import createList from "../scripts/createList.ts";

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
  id: "507f1f77bcf86cd799439011",
  name: "New List",
  idBoard: "380ae4943740524a3a8265ab",
} as const;

describe("createList: run", () => {
  it("POSTs a list and returns it", async () => {
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

    const input = createList.inputSchema.parse({
      name: "New List",
      idBoard: "380ae4943740524a3a8265ab",
    });
    const { data: result } = await createList.run(input, { fetch: fakeFetch });

    const call = calls[0]!;
    expect(call.init?.method ?? "GET").toBe("POST");
    expect(call.url).toContain("/lists");
    expect(createList.outputSchema.safeParse(result).success).toBe(true);
  });
});
