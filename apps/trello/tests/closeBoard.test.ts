import { describe, expect, it } from "vitest";

import closeBoard from "../scripts/closeBoard.ts";

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
  id: "380ae4943740524a3a8265ab",
  name: "Board",
} as const;

describe("closeBoard: run", () => {
  it("PUTs closed and returns the board", async () => {
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

    const input = closeBoard.inputSchema.parse({
      id: "380ae4943740524a3a8265ab",
      closed: true,
    });
    const { data: result } = await closeBoard.run(input, { fetch: fakeFetch });

    const call = calls[0]!;
    expect(call.init?.method ?? "GET").toBe("PUT");
    expect(call.url).toContain("/boards/");
    expect(call.url).toContain("380ae4943740524a3a8265ab");
    expect(closeBoard.outputSchema.safeParse(result).success).toBe(true);
  });
});
