import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import compareRefs from "../scripts/compareRefs.ts";

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({
      "content-type": "application/json",
      ...init.headers,
    }),
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response;
}

describe("compareRefs: run", () => {
  it("GETs the compare endpoint with from/to and returns the raw comparison object", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        commits: [{ id: "abc123", title: "Fix bug" }],
        diffs: [{ old_path: "a.ts", new_path: "a.ts", diff: "@@ -1 +1 @@" }],
        compare_same_ref: false,
      });
    }) as typeof globalThis.fetch;

    const { data } = await compareRefs.run(
      compareRefs.inputSchema.parse({
        projectId: "12",
        from: "main",
        to: "feature/x",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://gitlab.com/api/v4/projects/12/repository/compare",
    );
    expect(calls[0]?.url).toContain("from=main");
    expect(calls[0]?.url).toContain("to=feature");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.commits).toHaveLength(1);
    expect(data.commits[0]).toMatchObject({ id: "abc123" });
    expect(data.diffs[0]).toMatchObject({ old_path: "a.ts", new_path: "a.ts" });
    expect(data.compare_same_ref).toBe(false);
    expect(compareRefs.outputSchema.safeParse(data).success).toBe(true);
  });

  it("URL-encodes a full project path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ commits: [], diffs: [] });
    }) as typeof globalThis.fetch;

    await compareRefs.run(
      compareRefs.inputSchema.parse({
        projectId: "group/project",
        from: "a",
        to: "b",
      }),
      { fetch: fakeFetch },
    );
    expect(calls[0]?.url).toContain(
      "/projects/group%2Fproject/repository/compare",
    );
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await compareRefs
      .run(
        compareRefs.inputSchema.parse({ projectId: "12", from: "a", to: "b" }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
