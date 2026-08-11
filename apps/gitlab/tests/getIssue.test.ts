import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getIssue from "../scripts/getIssue.ts";

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

describe("getIssue: run", () => {
  it("GETs the project-scoped issue and returns the parsed body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        iid: 5,
        title: "Fix login",
        description: "Steps...",
        state: "opened",
        labels: ["bug"],
        assignees: [],
        web_url: "https://gitlab.com/g/p/-/issues/5",
      });
    }) as typeof globalThis.fetch;

    const { data } = await getIssue.run(
      getIssue.inputSchema.parse({ projectId: "12", issueIid: 5 }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/issues/5",
    );
    expect(calls[0]?.init?.method).toBe("GET");
    expect(data).toMatchObject({ iid: 5, title: "Fix login" });
    expect(getIssue.outputSchema.safeParse(data).success).toBe(true);
  });

  it("URL-encodes a full project path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ iid: 1, title: "t" });
    }) as typeof globalThis.fetch;

    await getIssue.run(
      getIssue.inputSchema.parse({ projectId: "group/project", issueIid: 1 }),
      { fetch: fakeFetch },
    );
    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/group%2Fproject/issues/1",
    );
  });

  it("throws a ConnectorHttpError on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await getIssue
      .run(getIssue.inputSchema.parse({ projectId: "12", issueIid: 9 }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
