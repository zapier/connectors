import { describe, expect, it } from "vitest";

import getBoard from "../scripts/getBoard.ts";

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

describe("getBoard: run", () => {
  it("GETs a board by id", async () => {
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

    const input = getBoard.inputSchema.parse({
      id: "380ae4943740524a3a8265ab",
    });
    const { data: result } = await getBoard.run(input, { fetch: fakeFetch });

    expect(calls[0]!.init?.method ?? "GET").toBe("GET");
    expect(calls[0]!.url).toContain("/boards/");
    expect(calls[0]!.url).toContain("380ae4943740524a3a8265ab");
    expect(getBoard.outputSchema.safeParse(result).success).toBe(true);
  });
});
