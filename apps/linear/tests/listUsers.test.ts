import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listUsersDefinition from "../scripts/listUsers.ts";

const { inputSchema, outputSchema } = listUsersDefinition;

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

const USERS = {
  data: {
    users: {
      nodes: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          name: "Ada Lovelace",
          email: "ada@example.com",
          displayName: "ada",
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  },
};

describe("listUsers: inputSchema", () => {
  it("accepts an empty input (query optional)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
    expect(inputSchema.safeParse({ query: "ada" }).success).toBe(true);
  });
});

describe("listUsers: governance", () => {
  it("is read-only", () => {
    expect(listUsersDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listUsersDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listUsers: run", () => {
  it("omits the filter when no query is given", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(USERS);
    }) as typeof globalThis.fetch;

    const { data: result } = await listUsersDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain(
      "users(filter: $filter, first: $first, after: $after)",
    );
    expect(body.variables).toEqual({
      filter: undefined,
      first: 50,
      after: undefined,
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.users).toHaveLength(1);
  });

  it("builds an or-filter over name and email when query is given", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(USERS);
    }) as typeof globalThis.fetch;

    await listUsersDefinition.run({ query: "ada" }, { fetch: fakeFetch });

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.variables.filter).toEqual({
      or: [
        { name: { containsIgnoreCase: "ada" } },
        { email: { containsIgnoreCase: "ada" } },
      ],
    });
  });

  it("throws a ConnectorHttpError when Linear returns an errors[] array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "Something went wrong" }],
      })) as typeof globalThis.fetch;

    const err = await listUsersDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
  });
});
