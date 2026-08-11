import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createBranch from "../scripts/createBranch.ts";

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

describe("createBranch: run", () => {
  it("POSTs branch + ref and returns the created branch", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        name: "feature/x",
        commit_sha: "abc123",
        web_url: "https://gitlab.com/g/p/-/tree/feature/x",
      });
    }) as typeof globalThis.fetch;

    const { data } = await createBranch.run(
      createBranch.inputSchema.parse({
        projectId: "12",
        branch: "feature/x",
        ref: "main",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/repository/branches",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ branch: "feature/x", ref: "main" });
    expect(data).toMatchObject({ name: "feature/x", commit_sha: "abc123" });
    expect(createBranch.outputSchema.safeParse(data).success).toBe(true);
  });

  it("URL-encodes a full project path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ name: "b" });
    }) as typeof globalThis.fetch;

    await createBranch.run(
      createBranch.inputSchema.parse({
        projectId: "group/project",
        branch: "b",
        ref: "main",
      }),
      { fetch: fakeFetch },
    );
    expect(calls[0]?.url).toContain(
      "/projects/group%2Fproject/repository/branches",
    );
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "400 Branch already exists" },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await createBranch
      .run(
        createBranch.inputSchema.parse({
          projectId: "12",
          branch: "main",
          ref: "main",
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
