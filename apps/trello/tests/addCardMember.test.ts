import { describe, expect, it } from "vitest";

import addCardMember from "../scripts/addCardMember.ts";

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
  name: "Card",
  idBoard: "380ae4943740524a3a8265ab",
  idList: "507f1f77bcf86cd799439011",
  url: "https://trello.com/c/abc",
  closed: false,
} as const;

describe("addCardMember: run", () => {
  it("POSTs a member id and returns the card", async () => {
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

    const input = addCardMember.inputSchema.parse({
      id: "5a8630538097a5ac7ab30633",
      value: "507f191e810c19729de860ea",
    });
    const { data: result } = await addCardMember.run(input, {
      fetch: fakeFetch,
    });

    const call = calls[0]!;
    expect(call.init?.method ?? "GET").toBe("POST");
    expect(call.url).toContain("/cards/");
    expect(call.url).toContain("/idMembers");
    expect(addCardMember.outputSchema.safeParse(result).success).toBe(true);
  });
});
