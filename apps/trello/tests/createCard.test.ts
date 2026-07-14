import { afterEach, describe, expect, it, vi } from "vitest";

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

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it("downloads attachmentFileUrl via globalThis.fetch, not ctx.fetch", async () => {
    const fileUrl = "https://host.example/file.pdf";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode("bytes").buffer,
      headers: new Headers({ "content-type": "application/pdf" }),
    } as unknown as Response);

    const ctxCalls: string[] = [];
    const ctxFetch: typeof globalThis.fetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      const urlStr =
        typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      ctxCalls.push(urlStr);
      if (urlStr.includes("/cards") && init?.method === "POST") {
        return jsonResponse(CANNED);
      }
      if (urlStr.includes("/attachments")) {
        return jsonResponse({ id: "att1", name: "attachment" });
      }
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const input = createCard.inputSchema.parse({
      idList: "507f1f77bcf86cd799439011",
      name: "New card",
      attachmentFileUrl: fileUrl,
    });
    await createCard.run(input, { fetch: ctxFetch });

    expect(globalThis.fetch).toHaveBeenCalledWith(fileUrl);
    expect(ctxCalls.some((u) => u === fileUrl)).toBe(false);
    expect(ctxCalls.some((u) => u.includes("/attachments"))).toBe(true);
  });

  it("throws when attachmentFileUrl cannot be downloaded", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    const ctxFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(CANNED)) as typeof globalThis.fetch;

    await expect(
      createCard.run(
        createCard.inputSchema.parse({
          idList: "507f1f77bcf86cd799439011",
          name: "New card",
          attachmentFileUrl: "https://host.example/missing.pdf",
        }),
        { fetch: ctxFetch },
      ),
    ).rejects.toThrow(/could not download attachmentFileUrl/);
  });
});
