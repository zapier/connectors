import { afterEach, describe, expect, it, vi } from "vitest";

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

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("downloads fileUrl via globalThis.fetch, not ctx.fetch", async () => {
    const fileUrl = "https://host.example/file.pdf";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode("bytes").buffer,
      headers: new Headers({ "content-type": "application/pdf" }),
    } as unknown as Response);

    const ctxCalls: string[] = [];
    const ctxFetch: typeof globalThis.fetch = (async (
      url: string | URL | Request,
    ) => {
      const urlStr =
        typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      ctxCalls.push(urlStr);
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const input = addCardAttachment.inputSchema.parse({
      id: "5a8630538097a5ac7ab30633",
      fileUrl,
    });
    const { data: result } = await addCardAttachment.run(input, {
      fetch: ctxFetch,
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(fileUrl);
    expect(ctxCalls).toHaveLength(1);
    expect(ctxCalls[0]).toContain("/attachments");
    expect(ctxCalls[0]).not.toBe(fileUrl);
    expect(addCardAttachment.outputSchema.safeParse(result).success).toBe(true);
  });

  it("throws when fileUrl cannot be downloaded", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    const ctxFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(CANNED)) as typeof globalThis.fetch;

    await expect(
      addCardAttachment.run(
        addCardAttachment.inputSchema.parse({
          id: "5a8630538097a5ac7ab30633",
          fileUrl: "https://host.example/missing.pdf",
        }),
        { fetch: ctxFetch },
      ),
    ).rejects.toThrow(/could not download fileUrl/);
  });
});
