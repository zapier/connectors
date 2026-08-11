import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getMergeRequest from "../scripts/getMergeRequest.ts";

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

describe("getMergeRequest: run", () => {
  it("GETs the project-scoped MR and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        iid: 5,
        title: "Fix auth",
        state: "opened",
        source_branch: "feature/x",
        target_branch: "main",
        merge_status: "can_be_merged",
        has_conflicts: false,
        web_url: "https://gitlab.com/g/p/-/merge_requests/5",
        sha: "abc123",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getMergeRequest.run(
      getMergeRequest.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/merge_requests/5",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data).toMatchObject({ iid: 5, title: "Fix auth", sha: "abc123" });
    expect(getMergeRequest.outputSchema.safeParse(data).success).toBe(true);
  });

  it("URL-encodes a full project path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ iid: 1, title: "t", web_url: "u" });
    }) as typeof globalThis.fetch;

    await getMergeRequest.run(
      getMergeRequest.inputSchema.parse({
        projectId: "group/project",
        mergeRequestIid: 1,
      }),
      { fetch: fakeFetch },
    );
    expect(calls[0]?.url).toContain(
      "/projects/group%2Fproject/merge_requests/1",
    );
  });

  it("throws a ConnectorHttpError on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getMergeRequest
      .run(
        getMergeRequest.inputSchema.parse({
          projectId: "12",
          mergeRequestIid: 9,
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
