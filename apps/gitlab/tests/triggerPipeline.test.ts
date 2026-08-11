import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import triggerPipeline from "../scripts/triggerPipeline.ts";

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

describe("triggerPipeline: run", () => {
  it("POSTs to the singular /pipeline path and converts the variables map into GitLab's array shape", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: 100,
        status: "created",
        ref: "main",
        sha: "abc123",
        web_url: "https://gitlab.com/g/p/-/pipelines/100",
      });
    }) as typeof globalThis.fetch;

    const { data } = await triggerPipeline.run(
      triggerPipeline.inputSchema.parse({
        projectId: "12",
        ref: "main",
        variables: { FOO: "bar" },
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/pipeline",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.ref).toBe("main");
    expect(body.variables).toEqual([{ key: "FOO", value: "bar" }]);
    expect(data).toMatchObject({ id: 100, status: "created" });
    expect(triggerPipeline.outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "403 Forbidden" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await triggerPipeline
      .run(
        triggerPipeline.inputSchema.parse({ projectId: "12", ref: "main" }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
