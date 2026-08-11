import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getProject from "../scripts/getProject.ts";

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

describe("getProject: run", () => {
  it("GETs the project by id and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: 12,
        path_with_namespace: "group/project",
        name: "project",
        default_branch: "main",
        web_url: "https://gitlab.com/group/project",
        visibility: "private",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getProject.run(
      getProject.inputSchema.parse({ projectId: "12" }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://gitlab.com/api/v4/projects/12");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data).toMatchObject({
      id: 12,
      path_with_namespace: "group/project",
    });
    expect(getProject.outputSchema.safeParse(data).success).toBe(true);
  });

  it("URL-encodes a full group/project path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ id: 1, path_with_namespace: "group/project" });
    }) as typeof globalThis.fetch;

    await getProject.run(
      getProject.inputSchema.parse({ projectId: "group/project" }),
      { fetch: fakeFetch },
    );
    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/group%2Fproject",
    );
  });

  it("throws a ConnectorHttpError on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getProject
      .run(getProject.inputSchema.parse({ projectId: "99" }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
