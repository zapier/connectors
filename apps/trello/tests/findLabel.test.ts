import { describe, expect, it } from "vitest";

import findLabel from "../scripts/findLabel.ts";

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
    id: "507f1f77bcf86cd799439012",
    idBoard: "380ae4943740524a3a8265ab",
    name: "Bug",
  },
] as const;

describe("findLabel: run", () => {
  it("GETs label search results", async () => {
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

    const input = findLabel.inputSchema.parse({
      id: "380ae4943740524a3a8265ab",
      name: "Bug",
    });
    const { data: result } = await findLabel.run(input, { fetch: fakeFetch });

    expect(calls[0]!.init?.method ?? "GET").toBe("GET");
    expect(calls[0]!.url).toContain("/_agent/boards/");
    expect(calls[0]!.url).toContain("/labels/find");
    expect(findLabel.outputSchema.safeParse(result).success).toBe(true);
  });
});
