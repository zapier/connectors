import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getPipeline from "../scripts/getPipeline.ts";

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

describe("getPipeline: run", () => {
  it("GETs the project-scoped pipeline and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: 321,
        status: "success",
        ref: "main",
        sha: "abc123",
        duration: 42,
        web_url: "https://gitlab.com/g/p/-/pipelines/321",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getPipeline.run(
      getPipeline.inputSchema.parse({ projectId: "12", pipelineId: 321 }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/pipelines/321",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data).toMatchObject({ id: 321, status: "success" });
    expect(getPipeline.outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a ConnectorHttpError on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getPipeline
      .run(getPipeline.inputSchema.parse({ projectId: "12", pipelineId: 9 }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
