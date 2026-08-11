import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createIssue from "../scripts/createIssue.ts";

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

describe("createIssue: run", () => {
  it("POSTs the issue body and returns the created issue", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        iid: 42,
        title: "Bug: crash on save",
        state: "opened",
        web_url: "https://gitlab.com/g/p/-/issues/42",
      });
    }) as typeof globalThis.fetch;

    const { data } = await createIssue.run(
      createIssue.inputSchema.parse({
        projectId: "12",
        title: "Bug: crash on save",
        description: "Steps to reproduce...",
        labels: ["bug"],
        assignee_ids: [7],
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://gitlab.com/api/v4/projects/12/issues");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toMatchObject({
      title: "Bug: crash on save",
      description: "Steps to reproduce...",
      labels: ["bug"],
      assignee_ids: [7],
    });
    expect(data).toMatchObject({ iid: 42, state: "opened" });
    expect(createIssue.outputSchema.safeParse(data).success).toBe(true);
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

    await createIssue.run(
      createIssue.inputSchema.parse({ projectId: "12", title: "t" }),
      { fetch: fakeFetch },
    );
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ title: "t" });
  });

  it("throws a ConnectorHttpError on 400", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: { title: ["can't be blank"] } },
        { status: 400 },
      )) as typeof globalThis.fetch;

    const err = await createIssue
      .run(createIssue.inputSchema.parse({ projectId: "12", title: "t" }), {
        fetch: fakeFetch,
      })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(400);
  });
});
