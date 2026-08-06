import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/listProjects.ts";

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

const TEAM_ID = "aaaaaaaa-1111-4222-8333-444455556666";

const PROJECTS_PAGE = {
  data: {
    projects: {
      nodes: [
        {
          id: "cccccccc-3333-4444-8555-666677778888",
          name: "Q3 Launch",
          state: "started",
          url: "https://linear.app/acme/project/q3-launch",
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: "CURSOR1" },
    },
  },
};

describe("listProjects: inputSchema", () => {
  it("accepts an empty input", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("rejects a non-uuid teamId", () => {
    expect(inputSchema.safeParse({ teamId: "not-a-uuid" }).success).toBe(false);
    expect(inputSchema.safeParse({ teamId: TEAM_ID }).success).toBe(true);
  });
});

describe("listProjects: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
    expect(definition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listProjects: run", () => {
  it("POSTs the Projects query with the team filter and maps a page", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(PROJECTS_PAGE);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { teamId: TEAM_ID, limit: 5 },
      { fetch: fakeFetch },
    );

    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
      variables: { filter: unknown; first: number; after: unknown };
    };
    expect(sent.query).toContain("query Projects");
    expect(sent.variables.filter).toEqual({
      accessibleTeams: { some: { id: { eq: TEAM_ID } } },
    });
    expect(sent.variables.first).toBe(5);

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.projects).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it("passes filter undefined and defaults first to 25 when teamId/limit omitted", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(PROJECTS_PAGE);
    }) as typeof globalThis.fetch;

    await definition.run({}, { fetch: fakeFetch });

    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      variables: { filter?: unknown; first: number };
    };
    expect(sent.variables.filter).toBeUndefined();
    expect(sent.variables.first).toBe(25);
  });

  it("throws a ConnectorHttpError when Linear returns an errors[] array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "Something went wrong" }],
      })) as typeof globalThis.fetch;

    const err = await definition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
  });
});
