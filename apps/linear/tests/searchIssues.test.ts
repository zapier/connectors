import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import searchIssuesDefinition from "../scripts/searchIssues.ts";

const { inputSchema, outputSchema } = searchIssuesDefinition;

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

const ISSUE_ID = "8a7b6c5d-1234-4abc-9def-0123456789ab";
const ASSIGNEE_ID = "2c3d4e5f-6789-4abc-9def-0123456789ab";

const ISSUES_PAGE = {
  data: {
    issues: {
      nodes: [
        {
          id: ISSUE_ID,
          identifier: "ENG-118",
          title: "Fix the login bug",
          url: "https://linear.app/acme/issue/ENG-118",
          state: { name: "In Progress" },
          assignee: { name: "Ada Lovelace" },
        },
      ],
      pageInfo: { hasNextPage: true, endCursor: "cur1" },
    },
  },
};

describe("searchIssues: inputSchema", () => {
  it("requires nothing (empty input parses)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts the documented filter fields", () => {
    expect(
      inputSchema.safeParse({
        query: "login",
        assigneeId: ASSIGNEE_ID,
        limit: 50,
        cursor: "cur0",
      }).success,
    ).toBe(true);
  });
});

describe("searchIssues: governance", () => {
  it("is read-only", () => {
    expect(searchIssuesDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("searchIssues: run", () => {
  it("builds a filter from the set inputs and maps pageInfo to cursor/hasMore", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(ISSUES_PAGE);
    }) as typeof globalThis.fetch;

    const { data: result } = await searchIssuesDefinition.run(
      { query: "login", assigneeId: ASSIGNEE_ID, limit: 50 },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");

    const posted = JSON.parse(calls[0]?.init?.body as string);
    expect(posted.query).toContain("issues(");
    // query -> filter.title.contains ; assigneeId -> filter.assignee.id.eq
    expect(posted.variables.filter).toEqual({
      title: { contains: "login" },
      assignee: { id: { eq: ASSIGNEE_ID } },
    });
    expect(posted.variables.first).toBe(50);

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.identifier).toBe("ENG-118");
    expect(result.nextCursor).toBe("cur1");
    expect(result.hasMore).toBe(true);
  });

  it("omits the filter and defaults first to 25 when no inputs are set", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse({
        data: {
          issues: {
            nodes: [],
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await searchIssuesDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    const posted = JSON.parse(calls[0]?.init?.body as string);
    expect(posted.variables.filter).toBeUndefined();
    expect(posted.variables.first).toBe(25);

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it("throws a ConnectorHttpError when Linear returns a top-level errors array (HTTP 200)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [
          {
            message: "Something failed",
            extensions: { userPresentableMessage: "Something failed" },
          },
        ],
      })) as typeof globalThis.fetch;

    const err = await searchIssuesDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toBe("Something failed");
  });
});
