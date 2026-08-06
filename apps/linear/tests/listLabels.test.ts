import { isConnectorHttpError } from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listLabelsDefinition from "../scripts/listLabels.ts";

const { inputSchema, outputSchema } = listLabelsDefinition;

const TEAM_ID = "11111111-1111-4111-8111-111111111111"; // pii:allow

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

const LABELS = {
  data: {
    issueLabels: {
      nodes: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          name: "bug",
          color: "#EB5757",
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  },
};

describe("listLabels: inputSchema", () => {
  it("accepts an empty input (teamId optional)", () => {
    expect(inputSchema.safeParse({}).success).toBe(true);
  });

  it("rejects a non-uuid teamId", () => {
    expect(inputSchema.safeParse({ teamId: "abc" }).success).toBe(false);
    expect(inputSchema.safeParse({ teamId: TEAM_ID }).success).toBe(true);
  });
});

describe("listLabels: governance", () => {
  it("is read-only", () => {
    expect(listLabelsDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listLabelsDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listLabels: run", () => {
  it("omits the filter when no teamId is given", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(LABELS);
    }) as typeof globalThis.fetch;

    const { data: result } = await listLabelsDefinition.run(
      {},
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain(
      "issueLabels(filter: $filter, first: $first, after: $after)",
    );
    expect(body.variables).toEqual({
      filter: undefined,
      first: 50,
      after: undefined,
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.labels).toHaveLength(1);
  });

  it("builds a team filter when teamId is given", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(LABELS);
    }) as typeof globalThis.fetch;

    await listLabelsDefinition.run({ teamId: TEAM_ID }, { fetch: fakeFetch });

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.variables.filter).toEqual({ team: { id: { eq: TEAM_ID } } });
  });

  it("throws a ConnectorHttpError when Linear returns an errors[] array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "Something went wrong" }],
      })) as typeof globalThis.fetch;

    const err = await listLabelsDefinition
      .run({}, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
  });
});
