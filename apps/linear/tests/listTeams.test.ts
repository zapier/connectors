import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listTeamsDefinition from "../scripts/listTeams.ts";

const { inputSchema, outputSchema } = listTeamsDefinition;

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

const TEAMS = {
  data: {
    teams: {
      nodes: [
        {
          id: "11111111-1111-4111-8111-111111111111", // pii:allow
          name: "Engineering",
          key: "ENG",
        },
      ],
      pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
    },
  },
};

describe("listTeams: inputSchema", () => {
  it("accepts an empty input (no required fields)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts optional limit + cursor", () => {
    expect(inputSchema.safeParse({ limit: 10, cursor: "c1" }).success).toBe(
      true,
    );
  });

  it("rejects an out-of-range limit", () => {
    expect(inputSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(inputSchema.safeParse({ limit: 101 }).success).toBe(false);
  });
});

describe("listTeams: governance", () => {
  it("is read-only", () => {
    expect(listTeamsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listTeamsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listTeams: run", () => {
  it("posts the Teams query and maps nodes + pageInfo to the page shape", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(TEAMS);
    }) as typeof globalThis.fetch;

    const { data: result } = await listTeamsDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain("teams(first: $first, after: $after)");
    expect(body.variables).toEqual({ first: 50, after: undefined });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.teams).toHaveLength(1);
    expect(result.nextCursor).toBe("cursor-1");
    expect(result.hasMore).toBe(true);
  });

  it("passes limit and cursor through as first/after", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(TEAMS);
    }) as typeof globalThis.fetch;

    await listTeamsDefinition.run(
      { limit: 10, cursor: "c1" },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.variables).toEqual({ first: 10, after: "c1" });
  });

  it("throws a ConnectorHttpError when Linear returns an errors[] array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "Something went wrong" }],
      })) as typeof globalThis.fetch;

    const err = await listTeamsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain(
      "Something went wrong",
    );
  });
});
