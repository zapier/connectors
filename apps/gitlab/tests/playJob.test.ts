import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import playJob from "../scripts/playJob.ts";

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

describe("playJob: run", () => {
  it("POSTs to the /jobs/<id>/play path with the supplied variables", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: 55,
        name: "deploy",
        status: "pending",
        stage: "deploy",
        web_url: "https://gitlab.com/g/p/-/jobs/55",
      });
    }) as typeof globalThis.fetch;

    const { data } = await playJob.run(
      playJob.inputSchema.parse({
        projectId: "12",
        jobId: 55,
        variables: { FOO: "bar" },
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/jobs/55/play",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.variables).toEqual({ FOO: "bar" });
    expect(data).toMatchObject({ id: 55, status: "pending" });
    expect(playJob.outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "400 Bad Request" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await playJob
      .run(playJob.inputSchema.parse({ projectId: "12", jobId: 9 }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
