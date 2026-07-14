import { describe, expect, it } from "vitest";

import createCard from "../scripts/createCard.ts";

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
  id: "5a8630538097a5ac7ab30633",
  name: "New card",
  idBoard: "380ae4943740524a3a8265ab",
  idList: "507f1f77bcf86cd799439011",
  url: "https://trello.com/c/abc",
  closed: false,
} as const;

describe("createCard: run", () => {
  it("POSTs a new card and returns it", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      const urlStr =
        typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      calls.push({ url: urlStr, init });
      if (String(url).includes("/cards") && init?.method === "POST") {
        return jsonResponse(CANNED);
      }
      if (String(url).includes("/cards/")) {
        return jsonResponse(CANNED);
      }
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const input = createCard.inputSchema.parse({
      idList: "507f1f77bcf86cd799439011",
      name: "New card",
    });
    const { data: result } = await createCard.run(input, { fetch: fakeFetch });

    const call = calls[0]!;
    expect(call.init?.method ?? "GET").toBe("POST");
    expect(call.url).toContain("/cards");
    expect(createCard.outputSchema.safeParse(result).success).toBe(true);
  });
});
