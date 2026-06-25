import { describe, expect, it } from "vitest";

import addMemberToBoard from "../scripts/addMemberToBoard.ts";

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

describe("addMemberToBoard: run", () => {
  it("POSTs a board membership invite and returns status", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      const urlStr =
        typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      calls.push({ url: urlStr, init });
      return jsonResponse({}, { status: 200 });
    }) as typeof globalThis.fetch;

    const input = addMemberToBoard.inputSchema.parse({
      id: "380ae4943740524a3a8265ab",
      email: "user@example.com",
    });
    const { data: result } = await addMemberToBoard.run(input, {
      fetch: fakeFetch,
    });

    const call = calls[0]!;
    expect(call.init?.method ?? "GET").toBe("POST");
    expect(call.url).toContain("/boards/");
    expect(call.url).toContain("/memberships");
    expect(addMemberToBoard.outputSchema.safeParse(result).success).toBe(true);
  });
});
