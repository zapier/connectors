import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import approveMergeRequest from "../scripts/approveMergeRequest.ts";

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

describe("approveMergeRequest: run", () => {
  it("POSTs to the /approve endpoint (approve omitted) with no JSON body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        iid: 5,
        approved: true,
        approvals_left: 0,
        approved_by: ["octocat"],
      });
    }) as typeof globalThis.fetch;

    const { data } = await approveMergeRequest.run(
      approveMergeRequest.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/merge_requests/5/approve",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.body).toBeUndefined();
    expect(data).toMatchObject({ iid: 5, approved: true });
    expect(approveMergeRequest.outputSchema.safeParse(data).success).toBe(true);
  });

  it("POSTs to the /unapprove endpoint when approve=false", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ iid: 5, approved: false });
    }) as typeof globalThis.fetch;

    const { data } = await approveMergeRequest.run(
      approveMergeRequest.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
        approve: false,
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/merge_requests/5/unapprove",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.body).toBeUndefined();
    expect(data).toMatchObject({ iid: 5, approved: false });
    expect(approveMergeRequest.outputSchema.safeParse(data).success).toBe(true);
  });

  it("throws a ConnectorHttpError on 401", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "401 Unauthorized" },
        { status: 401 },
      )) as typeof globalThis.fetch;

    const err = await approveMergeRequest
      .run(
        approveMergeRequest.inputSchema.parse({
          projectId: "12",
          mergeRequestIid: 5,
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(401);
  });
});
