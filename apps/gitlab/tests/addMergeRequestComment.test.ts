import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import addMergeRequestComment from "../scripts/addMergeRequestComment.ts";

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

describe("addMergeRequestComment: run", () => {
  it("POSTs { body } to the /notes endpoint and returns the created note", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        id: 100,
        body: "Nice work",
        author: "octocat",
        created_at: "2024-01-01T00:00:00+00:00",
      });
    }) as typeof globalThis.fetch;

    const { data } = await addMergeRequestComment.run(
      addMergeRequestComment.inputSchema.parse({
        projectId: "12",
        mergeRequestIid: 5,
        body: "Nice work",
      }),
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe(
      "https://gitlab.com/api/v4/projects/12/merge_requests/5/notes",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ body: "Nice work" });
    expect(data).toMatchObject({ id: 100, body: "Nice work" });
    expect(addMergeRequestComment.outputSchema.safeParse(data).success).toBe(
      true,
    );
  });

  it("throws a ConnectorHttpError on 404", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "404 Not found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await addMergeRequestComment
      .run(
        addMergeRequestComment.inputSchema.parse({
          projectId: "12",
          mergeRequestIid: 5,
          body: "hi",
        }),
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
