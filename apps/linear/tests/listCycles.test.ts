import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listCyclesDefinition from "../scripts/listCycles.ts";

const { inputSchema, outputSchema } = listCyclesDefinition;

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

const CYCLES = {
  data: {
    cycles: {
      nodes: [
        {
          id: "77777777-7777-4777-8777-777777777777",
          name: null,
          number: 12,
          startsAt: "2026-08-01T00:00:00.000Z",
          endsAt: "2026-08-14T00:00:00.000Z",
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  },
};

describe("listCycles: inputSchema", () => {
  it("requires teamId as a uuid", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ teamId: "abc" }).success).toBe(false);
    expect(inputSchema.safeParse({ teamId: TEAM_ID }).success).toBe(true);
  });
});

describe("listCycles: governance", () => {
  it("is read-only", () => {
    expect(listCyclesDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listCyclesDefinition.annotations?.destructiveHint).toBe(false);
  });
});

describe("listCycles: run", () => {
  it("posts the Cycles query with a team filter and accepts an unnamed cycle", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(CYCLES);
    }) as typeof globalThis.fetch;

    const { data: result } = await listCyclesDefinition.run(
      { teamId: TEAM_ID },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain(
      "cycles(filter: $filter, first: $first, after: $after)",
    );
    expect(body.variables).toEqual({
      filter: { team: { id: { eq: TEAM_ID } } },
      first: 50,
      after: undefined,
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.cycles[0]?.name).toBeNull();
    expect(result.cycles[0]?.number).toBe(12);
  });

  it("throws a ConnectorHttpError when Linear returns an errors[] array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "Entity not found: Team" }],
      })) as typeof globalThis.fetch;

    const err = await listCyclesDefinition
      .run({ teamId: TEAM_ID }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain("Entity not found");
  });
});
