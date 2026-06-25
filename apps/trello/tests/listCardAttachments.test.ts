import { describe, expect, it } from "vitest";

import listCardAttachments from "../scripts/listCardAttachments.ts";

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
    id: "507f1f77bcf86cd799439017",
    name: "file.pdf",
  },
] as const;

describe("listCardAttachments: run", () => {
  it("GETs card attachments", async () => {
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

    const input = listCardAttachments.inputSchema.parse({
      id: "5a8630538097a5ac7ab30633",
    });
    const { data: result } = await listCardAttachments.run(input, {
      fetch: fakeFetch,
    });

    expect(calls[0]!.init?.method ?? "GET").toBe("GET");
    expect(calls[0]!.url).toContain("/cards/");
    expect(calls[0]!.url).toContain("/attachments");
    expect(listCardAttachments.outputSchema.safeParse(result).success).toBe(
      true,
    );
  });
});
