import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getJobLog from "../scripts/getJobLog.ts";

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

describe("getJobLog: run", () => {
  it("GETs the trace endpoint and returns { job_id, log } from the text body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse("Running with gitlab-runner\nJob succeeded", {
        headers: { "content-type": "text/plain" },
      });
    }) as typeof globalThis.fetch;

    const { data } = await getJobLog.run(
      getJobLog.inputSchema.parse({ projectId: "12", jobId: 555 }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/jobs/555/trace",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data.job_id).toBe(555);
    expect(data.log).toBe("Running with gitlab-runner\nJob succeeded");
    expect(getJobLog.outputSchema.safeParse(data).success).toBe(true);
  });

  it("URL-encodes a full project path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse("log", { headers: { "content-type": "text/plain" } });
    }) as typeof globalThis.fetch;

    await getJobLog.run(
      getJobLog.inputSchema.parse({ projectId: "group/project", jobId: 1 }),
      { fetch: fakeFetch },
    );
    expect(calls[0]?.url).toContain("/projects/group%2Fproject/jobs/1/trace");
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getJobLog
      .run(getJobLog.inputSchema.parse({ projectId: "12", jobId: 9 }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
