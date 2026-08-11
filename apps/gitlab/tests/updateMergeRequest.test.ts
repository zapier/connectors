import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateMergeRequest from "../scripts/updateMergeRequest.ts";

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

describe("updateMergeRequest: run", () => {
  it("PUTs a snake_case body and returns the updated MR", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        iid: 5,
        title: "New title",
        state: "opened",
        web_url: "https://gitlab.com/g/p/-/merge_requests/5",
      });
    }) as typeof globalThis.fetch;

    const { data } = await updateMergeRequest.run(
      updateMergeRequest.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
        title: "New title",
        description: "body",
        target_branch: "develop",
        add_labels: ["ready"],
        remove_labels: ["wip"],
        state_event: "close",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/merge_requests/5",
    );
    expect(calls[0]?.init?.method).toBe("PUT");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({
      title: "New title",
      description: "body",
      target_branch: "develop",
      add_labels: ["ready"],
      remove_labels: ["wip"],
      state_event: "close",
    });
    expect(data).toMatchObject({ iid: 5, title: "New title" });
    expect(updateMergeRequest.outputSchema.safeParse(data).success).toBe(true);
  });

  it("omits optional fields the caller did not supply", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ iid: 5, title: "t" });
    }) as typeof globalThis.fetch;

    await updateMergeRequest.run(
      updateMergeRequest.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
        state_event: "reopen",
      }),
      { fetch: fakeFetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ state_event: "reopen" });
  });

  it("throws a ConnectorHttpError on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await updateMergeRequest
      .run(
        updateMergeRequest.inputSchema.parse({
          projectId: "12",
          mergeRequestIid: 5,
          title: "t",
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
