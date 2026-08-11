import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import addIssueComment from "../scripts/addIssueComment.ts";

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

describe("addIssueComment: run", () => {
  it("POSTs the comment body to the notes endpoint and returns the created note", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: 101,
        body: "Looks good",
        author: "octocat",
        created_at: "2026-08-10T12:00:00.000Z",
      });
    }) as typeof globalThis.fetch;

    const { data } = await addIssueComment.run(
      addIssueComment.inputSchema.parse({
        projectId: "12",
        issueIid: 5,
        body: "Looks good",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/issues/5/notes",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const sent = JSON.parse(calls[0]?.init?.body as string);
    expect(sent).toEqual({ body: "Looks good" });
    expect(data).toMatchObject({ id: 101, body: "Looks good" });
    expect(addIssueComment.outputSchema.safeParse(data).success).toBe(true);
  });

  it("URL-encodes a full project path", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse({ id: 1, body: "hi" });
    }) as typeof globalThis.fetch;

    await addIssueComment.run(
      addIssueComment.inputSchema.parse({
        projectId: "group/project",
        issueIid: 1,
        body: "hi",
      }),
      { fetch: fakeFetch },
    );
    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/group%2Fproject/issues/1/notes",
    );
  });

  it("throws a ConnectorHttpError on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await addIssueComment
      .run(
        addIssueComment.inputSchema.parse({
          projectId: "12",
          issueIid: 5,
          body: "hi",
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
