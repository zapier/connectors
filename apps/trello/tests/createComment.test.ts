import { describe, expect, it } from "vitest";

import createComment from "../scripts/createComment.ts";

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
  id: "507f1f77bcf86cd799439015",
  type: "commentCard",
  date: "2025-01-01T12:00:00.000Z",
} as const;

describe("createComment: run", () => {
  it("POSTs a comment and returns the action", async () => {
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

    const input = createComment.inputSchema.parse({
      id: "5a8630538097a5ac7ab30633",
      text: "Hello",
    });
    const { data: result } = await createComment.run(input, {
      fetch: fakeFetch,
    });

    const call = calls[0]!;
    expect(call.init?.method ?? "GET").toBe("POST");
    expect(call.url).toContain("/cards/");
    expect(call.url).toContain("/actions/comments");
    expect(createComment.outputSchema.safeParse(result).success).toBe(true);
  });
});
