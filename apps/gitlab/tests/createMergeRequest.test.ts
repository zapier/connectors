import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createMergeRequest from "../scripts/createMergeRequest.ts";

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

describe("createMergeRequest: run", () => {
  it("POSTs a snake_case body and returns the created MR", async () => {
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
        web_url: "https://gitlab.com/g/p/-/merge_requests/5",
        source_branch: "feature/x",
        target_branch: "main",
      });
    }) as typeof globalThis.fetch;

    const { data } = await createMergeRequest.run(
      createMergeRequest.inputSchema.parse({
        projectId: "12",
        source_branch: "feature/x",
        target_branch: "main",
        title: "Fix auth",
        description: "body",
        reviewer_ids: [7],
        assignee_ids: [3],
        labels: ["bug"],
        remove_source_branch: true,
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/merge_requests",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({
      source_branch: "feature/x",
      target_branch: "main",
      title: "Fix auth",
      description: "body",
      reviewer_ids: [7],
      assignee_ids: [3],
      labels: ["bug"],
      remove_source_branch: true,
    });
    expect(data).toMatchObject({ iid: 5, state: "opened" });
    expect(createMergeRequest.outputSchema.safeParse(data).success).toBe(true);
  });

  it("omits optional fields the caller did not supply", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ iid: 1, title: "t" });
    }) as typeof globalThis.fetch;

    await createMergeRequest.run(
      createMergeRequest.inputSchema.parse({
        projectId: "12",
        source_branch: "a",
        target_branch: "main",
        title: "t",
      }),
      { fetch: fakeFetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({
      source_branch: "a",
      target_branch: "main",
      title: "t",
    });
  });

  it("throws a ConnectorHttpError on 400", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "400 Bad request" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await createMergeRequest
      .run(
        createMergeRequest.inputSchema.parse({
          projectId: "12",
          source_branch: "a",
          target_branch: "main",
          title: "t",
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
