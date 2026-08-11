import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import cancelPipeline from "../scripts/cancelPipeline.ts";

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

describe("cancelPipeline: run", () => {
  it("POSTs to the /cancel path and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: 321,
        status: "canceled",
        ref: "main",
        sha: "abc123",
        web_url: "https://gitlab.com/g/p/-/pipelines/321",
      });
    }) as typeof globalThis.fetch;

    const { data } = await cancelPipeline.run(
      cancelPipeline.inputSchema.parse({ projectId: "12", pipelineId: 321 }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/pipelines/321/cancel",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(data).toMatchObject({ id: 321, status: "canceled" });
    expect(cancelPipeline.outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "403 Forbidden" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await cancelPipeline
      .run(
        cancelPipeline.inputSchema.parse({ projectId: "12", pipelineId: 9 }),
        {
          fetch: fakeFetch,
        },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
