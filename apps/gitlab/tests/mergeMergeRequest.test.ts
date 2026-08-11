import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import mergeMergeRequest from "../scripts/mergeMergeRequest.ts";

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

describe("mergeMergeRequest: run", () => {
  it("PUTs to the /merge endpoint and forwards squash + sha in the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        iid: 5,
        state: "merged",
        merge_commit_sha: "deadbeef",
        web_url: "https://gitlab.com/g/p/-/merge_requests/5",
      });
    }) as typeof globalThis.fetch;

    const { data } = await mergeMergeRequest.run(
      mergeMergeRequest.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
        squash: true,
        sha: "abc123",
        merge_commit_message: "Merge it",
        should_remove_source_branch: true,
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/merge_requests/5/merge",
    );
    expect(calls[0]?.init?.method).toBe("PUT");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({
      merge_commit_message: "Merge it",
      squash: true,
      sha: "abc123",
      should_remove_source_branch: true,
    });
    expect(data).toMatchObject({ iid: 5, state: "merged" });
    expect(mergeMergeRequest.outputSchema.safeParse(data).success).toBe(true);
  });

  it("omits optional fields the caller did not supply", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ iid: 5, state: "merged" });
    }) as typeof globalThis.fetch;

    await mergeMergeRequest.run(
      mergeMergeRequest.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
      }),
      { fetch: fakeFetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({});
  });

  it("throws a ConnectorHttpError on 405 (not mergeable)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "405 Method Not Allowed" },
        { status: 405 },
      )) as typeof globalThis.fetch;

    const err = await mergeMergeRequest
      .run(
        mergeMergeRequest.inputSchema.parse({
          projectId: "12",
          mergeRequestIid: 5,
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(405);
  });
});
