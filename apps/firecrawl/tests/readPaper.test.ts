import { describe, expect, it } from "vitest";

import readPaperDefinition from "../scripts/readPaper.ts";

const { inputSchema } = readPaperDefinition;

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

const PAPER = {
  paperId: "arxiv:2105.05233",
  title: "Diffusion Models Beat GANs",
  abstract: "We show...",
};

describe("readPaper: inputSchema", () => {
  it("requires id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ id: "arxiv:2105.05233" }).success).toBe(
      true,
    );
  });

  it("accepts optional query and k for read mode", () => {
    const parsed = inputSchema.safeParse({
      id: "arxiv:2105.05233",
      query: "training objective",
      k: 5,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("readPaper: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(readPaperDefinition.annotations?.readOnlyHint).toBe(true);
    expect(readPaperDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("readPaper: run", () => {
  it("GETs /v2/search/research/papers/{id} with query and returns paper + passages", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        paper: PAPER,
        passages: [{ text: "relevant passage", score: 0.7 }],
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await readPaperDefinition.run(
      { id: "arxiv:2105.05233", query: "training objective" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.init?.method).toBe("GET");
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe(
      `/v2/search/research/papers/${encodeURIComponent("arxiv:2105.05233")}`,
    );
    expect(url.searchParams.get("query")).toBe("training objective");
    expect(result.paper).toEqual(PAPER);
    expect(result.passages).toHaveLength(1);
  });

  it("omits query param when not provided", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ paper: PAPER });
    }) as typeof globalThis.fetch;

    await readPaperDefinition.run(
      { id: "arxiv:2105.05233" },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]!.url);
    expect(url.searchParams.has("query")).toBe(false);
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Payment Required" },
        { status: 402 },
      )) as typeof globalThis.fetch;

    await expect(
      readPaperDefinition.run({ id: "arxiv:2105.05233" }, { fetch: fakeFetch }),
    ).rejects.toThrow();
  });
});
