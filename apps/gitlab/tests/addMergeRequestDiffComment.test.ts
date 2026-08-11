import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import addMergeRequestDiffComment from "../scripts/addMergeRequestDiffComment.ts";

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

describe("addMergeRequestDiffComment: run", () => {
  it("POSTs a nested position object to the discussions endpoint", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "disc-1",
        notes: [{ id: 99, body: "Looks off here" }],
        web_url: "https://gitlab.com/g/p/-/merge_requests/5#note_99",
      });
    }) as typeof globalThis.fetch;

    const { data } = await addMergeRequestDiffComment.run(
      addMergeRequestDiffComment.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
        body: "Looks off here",
        file_path: "src/app.ts",
        line: 42,
        base_sha: "base1",
        head_sha: "head1",
        start_sha: "start1",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/merge_requests/5/discussions",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({
      body: "Looks off here",
      position: {
        position_type: "text",
        base_sha: "base1",
        head_sha: "head1",
        start_sha: "start1",
        new_path: "src/app.ts",
        new_line: 42,
      },
    });
    expect(data).toMatchObject({ id: "disc-1" });
    expect(
      addMergeRequestDiffComment.outputSchema.safeParse(data).success,
    ).toBe(true);
  });

  it("URL-encodes a full project path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ id: "disc-2" });
    }) as typeof globalThis.fetch;

    await addMergeRequestDiffComment.run(
      addMergeRequestDiffComment.inputSchema.parse({
        projectId: "group/project",
        mergeRequestIid: 7,
        body: "b",
        file_path: "a.ts",
        line: 1,
        base_sha: "b1",
        head_sha: "h1",
        start_sha: "s1",
      }),
      { fetch: fakeFetch },
    );
    expect(calls[0]?.url).toContain(
      "/projects/group%2Fproject/merge_requests/7/discussions",
    );
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "400 Bad Request" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await addMergeRequestDiffComment
      .run(
        addMergeRequestDiffComment.inputSchema.parse({
          projectId: "12",
          mergeRequestIid: 5,
          body: "b",
          file_path: "a.ts",
          line: 1,
          base_sha: "b1",
          head_sha: "h1",
          start_sha: "s1",
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
