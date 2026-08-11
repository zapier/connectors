import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import commitFiles from "../scripts/commitFiles.ts";

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

describe("commitFiles: run", () => {
  it("POSTs branch, commit_message, and the actions array with snake_case keys", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: "abc123def456",
        short_id: "abc123d",
        title: "Add file",
        web_url: "https://gitlab.com/g/p/-/commit/abc123def456",
        created_at: "2024-01-01T00:00:00+00:00",
      });
    }) as typeof globalThis.fetch;

    const { data } = await commitFiles.run(
      commitFiles.inputSchema.parse({
        projectId: "12",
        branch: "main",
        commit_message: "Add file",
        actions: [
          { action: "create", file_path: "docs/x.md", content: "hello" },
        ],
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/repository/commits",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({
      branch: "main",
      commit_message: "Add file",
      actions: [{ action: "create", file_path: "docs/x.md", content: "hello" }],
    });
    expect(data).toMatchObject({ id: "abc123def456" });
    expect(commitFiles.outputSchema.safeParse(data).success).toBe(true);
  });

  it("forwards the optional start_branch when supplied", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({ id: "x" });
    }) as typeof globalThis.fetch;

    await commitFiles.run(
      commitFiles.inputSchema.parse({
        projectId: "12",
        branch: "feature",
        commit_message: "m",
        start_branch: "main",
        actions: [{ action: "delete", file_path: "old.txt" }],
      }),
      { fetch: fakeFetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.start_branch).toBe("main");
    expect(body.actions[0]).toEqual({ action: "delete", file_path: "old.txt" });
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "400 Bad Request" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await commitFiles
      .run(
        commitFiles.inputSchema.parse({
          projectId: "12",
          branch: "main",
          commit_message: "m",
          actions: [{ action: "create", file_path: "a.txt", content: "x" }],
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
