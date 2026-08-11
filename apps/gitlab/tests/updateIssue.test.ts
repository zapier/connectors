import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateIssue from "../scripts/updateIssue.ts";

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

describe("updateIssue: run", () => {
  it("PUTs the supplied fields and returns the updated issue", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        iid: 5,
        title: "New title",
        state: "closed",
        web_url: "https://gitlab.com/g/p/-/issues/5",
      });
    }) as typeof globalThis.fetch;

    const { data } = await updateIssue.run(
      updateIssue.inputSchema.parse({
        projectId: "12",
        issueIid: 5,
        title: "New title",
        add_labels: ["urgent"],
        state_event: "close",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/issues/5",
    );
    expect(calls[0]?.init?.method).toBe("PUT");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toMatchObject({
      title: "New title",
      add_labels: ["urgent"],
      state_event: "close",
    });
    expect(data).toMatchObject({ iid: 5, state: "closed" });
    expect(updateIssue.outputSchema.safeParse(data).success).toBe(true);
  });

  it("omits fields the caller did not supply", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({
        iid: 1,
        title: "t",
        state: "opened",
        web_url: "u",
      });
    }) as typeof globalThis.fetch;

    await updateIssue.run(
      updateIssue.inputSchema.parse({
        projectId: "12",
        issueIid: 1,
        title: "t",
      }),
      { fetch: fakeFetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ title: "t" });
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "403 Forbidden" },
        { status: 403 },
      )) as typeof globalThis.fetch;

    const err = await updateIssue
      .run(
        updateIssue.inputSchema.parse({
          projectId: "12",
          issueIid: 1,
          title: "t",
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(403);
  });
});
