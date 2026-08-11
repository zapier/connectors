import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listPipelines from "../scripts/listPipelines.ts";

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

describe("listPipelines: run", () => {
  it("GETs the /pipelines path, applies the default per_page, and wraps the array in { items, nextPage }", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(
        [
          {
            id: 1,
            status: "success",
            ref: "main",
            sha: "abc",
            web_url: "u",
          },
        ],
        { headers: { "x-next-page": "2" } },
      );
    }) as typeof globalThis.fetch;

    const { data } = await listPipelines.run(
      listPipelines.inputSchema.parse({ projectId: "12" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain(
      "https://gitlab.com/api/v4/projects/12/pipelines",
    );
    expect(calls[0]?.url).toContain("per_page=20");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.items).toHaveLength(1);
    expect(data.nextPage).toBe(2);
    expect(listPipelines.outputSchema.safeParse(data).success).toBe(true);
  });

  it("returns nextPage=null on the last page and forwards ref/status filters", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse([], { headers: {} });
    }) as typeof globalThis.fetch;

    const { data } = await listPipelines.run(
      listPipelines.inputSchema.parse({
        projectId: "12",
        ref: "main",
        status: "failed",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toContain("ref=main");
    expect(calls[0]?.url).toContain("status=failed");
    expect(data.nextPage).toBeNull();
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "401 Unauthorized" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await listPipelines
      .run(listPipelines.inputSchema.parse({ projectId: "12" }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
