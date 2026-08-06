import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listWorkflowStatesDefinition from "../scripts/listWorkflowStates.ts";

const { inputSchema, outputSchema } = listWorkflowStatesDefinition;

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

const STATES = {
  data: {
    workflowStates: {
      nodes: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "In Progress",
          type: "started",
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  },
};

describe("listWorkflowStates: inputSchema", () => {
  it("requires teamId as a uuid", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ teamId: "not-a-uuid" }).success).toBe(false);
    expect(inputSchema.safeParse({ teamId: TEAM_ID }).success).toBe(true);
  });
});

describe("listWorkflowStates: governance", () => {
  it("is read-only", () => {
    expect(listWorkflowStatesDefinition.annotations?.readOnlyHint).toBe(true);
    expect(listWorkflowStatesDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("listWorkflowStates: run", () => {
  it("posts the WorkflowStates query with a team filter and maps the page", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(STATES);
    }) as typeof globalThis.fetch;

    const { data: result } = await listWorkflowStatesDefinition.run(
      { teamId: TEAM_ID },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain(
      "workflowStates(filter: $filter, first: $first, after: $after)",
    );
    expect(body.variables).toEqual({
      filter: { team: { id: { eq: TEAM_ID } } },
      first: 50,
      after: undefined,
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.states).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
    expect(result.hasMore).toBe(false);
  });

  it("throws a ConnectorHttpError when Linear returns an errors[] array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "Entity not found: Team" }],
      })) as typeof globalThis.fetch;

    const err = await listWorkflowStatesDefinition
      .run({ teamId: TEAM_ID }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain("Entity not found");
  });
});
