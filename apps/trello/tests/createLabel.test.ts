import { describe, expect, it } from "vitest";

import createLabel from "../scripts/createLabel.ts";

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
  id: "507f1f77bcf86cd799439012",
  idBoard: "380ae4943740524a3a8265ab",
} as const;

describe("createLabel: run", () => {
  it("POSTs a label and returns it", async () => {
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

    const input = createLabel.inputSchema.parse({
      idBoard: "380ae4943740524a3a8265ab",
    });
    const { data: result } = await createLabel.run(input, { fetch: fakeFetch });

    const call = calls[0]!;
    expect(call.init?.method ?? "GET").toBe("POST");
    expect(call.url).toContain("/labels");
    expect(createLabel.outputSchema.safeParse(result).success).toBe(true);
  });
});
