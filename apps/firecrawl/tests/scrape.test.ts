import { describe, expect, it } from "vitest";

import scrapeDefinition from "../scripts/scrape.ts";

const { inputSchema } = scrapeDefinition;

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

const DOC = {
  markdown: "# Example\n\nHello.",
  metadata: {
    sourceURL: "https://example.com",
    url: "https://example.com/",
    statusCode: 200,
  },
};

describe("scrape: inputSchema", () => {
  it("requires url", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ url: "https://example.com" }).success).toBe(
      true,
    );
  });

  it("accepts formats, actions, and json-extraction inputs", () => {
    const parsed = inputSchema.safeParse({
      url: "https://example.com",
      formats: ["markdown", "json"],
      jsonPrompt: "extract the title",
      actions: [{ type: "click", selector: "#more" }],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("scrape: governance", () => {
  it("is read-only, non-destructive", () => {
    expect(scrapeDefinition.annotations?.readOnlyHint).toBe(true);
    expect(scrapeDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("scrape: run", () => {
  it("POSTs /v2/scrape and returns the unwrapped document", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ success: true, data: DOC });
    }) as typeof globalThis.fetch;

    const { data: result } = await scrapeDefinition.run(
      { url: "https://example.com", formats: ["markdown"] },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.firecrawl.dev/v2/scrape");
    expect(calls[0]!.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]!.init?.body));
    expect(sentBody).toMatchObject({
      url: "https://example.com",
      formats: ["markdown"],
    });
    // envelope unwrapped: agent sees the document directly, not { success, data }
    expect(result.markdown).toBe(DOC.markdown);
    expect(result.metadata?.statusCode).toBe(200);
  });

  it("throws on a non-2xx response", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { success: false, error: "Payment Required: Insufficient credits" },
        { status: 402 },
      )) as typeof globalThis.fetch;

    await expect(
      scrapeDefinition.run(
        { url: "https://example.com" },
        { fetch: fakeFetch },
      ),
    ).rejects.toThrow();
  });
});
