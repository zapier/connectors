import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/listIssueComments.ts";

const { inputSchema, outputSchema } = definition;

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  const status = init.status ?? 200;
  const ok = status >= 200 && status < 300;
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

const COMMENTS_PAGE = {
  data: {
    issue: {
      comments: {
        nodes: [
          {
            id: "b3d8e0a1-1111-4222-8333-444455556666",
            url: "https://linear.app/acme/issue/ENG-118#comment-1",
            body: "Looks good to me.",
            createdAt: "2026-08-01T12:00:00.000Z",
            user: { id: "a1a1a1a1-2222-4333-8444-555566667777", name: "Ada" },
          },
        ],
        pageInfo: { hasNextPage: true, endCursor: "CURSOR2" },
      },
    },
  },
};

describe("listIssueComments: inputSchema", () => {
  it("requires issueId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ issueId: "ENG-118" }).success).toBe(true);
  });

  it("rejects an out-of-range limit", () => {
    expect(
      inputSchema.safeParse({ issueId: "ENG-118", limit: 0 }).success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({ issueId: "ENG-118", limit: 101 }).success,
    ).toBe(false);
  });
});

describe("listIssueComments: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
    expect(definition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listIssueComments: run", () => {
  it("POSTs the IssueComments query and maps the connection to a page", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(COMMENTS_PAGE);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { issueId: "ENG-118", limit: 10, cursor: "CURSOR1" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
      variables: Record<string, unknown>;
    };
    expect(sent.query).toContain("query IssueComments");
    expect(sent.variables).toMatchObject({
      id: "ENG-118",
      first: 10,
      after: "CURSOR1",
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.comments).toHaveLength(1);
    expect(result.nextCursor).toBe("CURSOR2");
    expect(result.hasMore).toBe(true);
  });

  it("defaults first to 25 when limit is omitted", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(COMMENTS_PAGE);
    }) as typeof globalThis.fetch;

    await definition.run({ issueId: "ENG-118" }, { fetch: fakeFetch });

    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      variables: { first: number };
    };
    expect(sent.variables.first).toBe(25);
  });

  it("throws a ConnectorHttpError when Linear returns an errors[] array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "Entity not found: Issue" }],
      })) as typeof globalThis.fetch;

    const err = await definition
      .run({ issueId: "ENG-000" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain("Entity not found");
  });
});
