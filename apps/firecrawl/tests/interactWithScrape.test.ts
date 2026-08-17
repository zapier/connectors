import { describe, expect, it } from "vitest";

import interactWithScrapeDefinition from "../scripts/interactWithScrape.ts";

const { inputSchema } = interactWithScrapeDefinition;

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

describe("interactWithScrape: inputSchema", () => {
  it("requires jobId and treats code/prompt as mutually exclusive", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    // just code
    expect(
      inputSchema.safeParse({ jobId: "job_1", code: "1 + 1" }).success,
    ).toBe(true);
    // just prompt
    expect(
      inputSchema.safeParse({ jobId: "job_1", prompt: "click login" }).success,
    ).toBe(true);
    // both code AND prompt => fail
    expect(
      inputSchema.safeParse({
        jobId: "job_1",
        code: "1 + 1",
        prompt: "click login",
      }).success,
    ).toBe(false);
  });
});

describe("interactWithScrape: governance", () => {
  it("is a non-read-only POST", () => {
    expect(interactWithScrapeDefinition.annotations?.readOnlyHint).toBeFalsy();
    expect(interactWithScrapeDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("interactWithScrape: run", () => {
  it("POSTs /v2/scrape/{jobId}/interact and returns output/stdout", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        success: true,
        output: "Logged in",
        stdout: "done",
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await interactWithScrapeDefinition.run(
      { jobId: "job_1", prompt: "click login" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://api.firecrawl.dev/v2/scrape/job_1/interact",
    );
    expect(calls[0]!.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]!.init?.body));
    expect(sentBody).toMatchObject({ prompt: "click login" });
    expect(result.output).toBe("Logged in");
    expect(result.stdout).toBe("done");
  });
});
