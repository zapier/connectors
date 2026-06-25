import { describe, expect, it } from "vitest";

import addCardAttachment from "../scripts/addCardAttachment.ts";

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
  id: "507f1f77bcf86cd799439017",
  name: "doc.pdf",
  url: "https://example.com/doc.pdf",
} as const;

describe("addCardAttachment: run", () => {
  it("POSTs a URL attachment and returns it", async () => {
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

    const input = addCardAttachment.inputSchema.parse({
      id: "5a8630538097a5ac7ab30633",
      url: "https://example.com/doc.pdf",
    });
    const { data: result } = await addCardAttachment.run(input, {
      fetch: fakeFetch,
    });

    const call = calls[0]!;
    expect(call.init?.method ?? "GET").toBe("POST");
    expect(call.url).toContain("/cards/");
    expect(call.url).toContain("/attachments");
    expect(addCardAttachment.outputSchema.safeParse(result).success).toBe(true);
  });
});
