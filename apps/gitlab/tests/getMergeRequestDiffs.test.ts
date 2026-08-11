import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getMergeRequestDiffs from "../scripts/getMergeRequestDiffs.ts";

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

describe("getMergeRequestDiffs: run", () => {
  it("GETs the /diffs endpoint with the default per_page and wraps the array", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(
        [
          {
            old_path: "a.txt",
            new_path: "a.txt",
            new_file: false,
            deleted_file: false,
            renamed_file: false,
            diff: "@@ -1 +1 @@",
          },
        ],
        { headers: { "x-next-page": "2" } },
      );
    }) as typeof globalThis.fetch;

    const { data } = await getMergeRequestDiffs.run(
      getMergeRequestDiffs.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://gitlab.com/api/v4/projects/12/merge_requests/5/diffs",
    );
    expect(calls[0]?.url).toContain("per_page=10");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.nextPage).toBe(2);
    expect(getMergeRequestDiffs.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("returns nextPage=null on the last page (no x-next-page header)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse([], { headers: {} })) as typeof globalThis.fetch;

    const { data } = await getMergeRequestDiffs.run(
      getMergeRequestDiffs.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
      }),
      { fetch: fakeFetch },
    );
    expect(data.items).toHaveLength(0);
    expect(data.nextPage).toBeNull();
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getMergeRequestDiffs
      .run(
        getMergeRequestDiffs.inputSchema.parse({
          projectId: "12",
          mergeRequestIid: 5,
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
