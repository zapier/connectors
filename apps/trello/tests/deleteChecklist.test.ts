import { describe, expect, it } from "vitest";

import deleteChecklist from "../scripts/deleteChecklist.ts";

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

describe("deleteChecklist: run", () => {
  it("DELETEs a checklist and returns status", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      const urlStr =
        typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      calls.push({ url: urlStr, init });
      return jsonResponse({}, { status: 200 });
    }) as typeof globalThis.fetch;

    const input = deleteChecklist.inputSchema.parse({
      id: "507f1f77bcf86cd799439013",
    });
    const { data: result } = await deleteChecklist.run(input, {
      fetch: fakeFetch,
    });

    const call = calls[0]!;
    expect(call.init?.method ?? "GET").toBe("DELETE");
    expect(call.url).toContain("/checklists/");
    expect(call.url).toContain("507f1f77bcf86cd799439013");
    expect(deleteChecklist.outputSchema.safeParse(result).success).toBe(true);
  });
});
