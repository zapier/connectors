import { describe, expect, it } from "vitest";

import executeBrowserCodeDefinition from "../scripts/executeBrowserCode.ts";

const { inputSchema } = executeBrowserCodeDefinition;

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

describe("executeBrowserCode: inputSchema", () => {
  it("requires sessionId and code", () => {
    expect(inputSchema.safeParse({ sessionId: "sess_abc" }).success).toBe(
      false,
    );
    expect(inputSchema.safeParse({ code: "page.goto(...)" }).success).toBe(
      false,
    );
    expect(
      inputSchema.safeParse({ sessionId: "sess_abc", code: "1 + 1" }).success,
    ).toBe(true);
  });
});

describe("executeBrowserCode: governance", () => {
  it("is a non-read-only POST", () => {
    expect(executeBrowserCodeDefinition.annotations?.readOnlyHint).toBeFalsy();
    expect(executeBrowserCodeDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("executeBrowserCode: run", () => {
  it("POSTs /v2/interact/{sessionId}/execute and returns stdout/exitCode", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ success: true, stdout: "2", exitCode: 0 });
    }) as typeof globalThis.fetch;

    const { data: result } = await executeBrowserCodeDefinition.run(
      { sessionId: "sess_abc", code: "1 + 1" },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://api.firecrawl.dev/v2/interact/sess_abc/execute",
    );
    expect(calls[0]!.init?.method).toBe("POST");
    const sentBody = JSON.parse(String(calls[0]!.init?.body));
    expect(sentBody).toMatchObject({ code: "1 + 1" });
    expect(result.stdout).toBe("2");
    expect(result.exitCode).toBe(0);
  });
});
