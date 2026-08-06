import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/updateProject.ts";

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

const PROJECT_ID = "cccccccc-3333-4444-8555-666677778888";

const PROJECT_UPDATED = {
  data: {
    projectUpdate: {
      success: true,
      project: {
        id: PROJECT_ID,
        name: "Q3 Launch",
        url: "https://linear.app/acme/project/q3-launch",
        state: "started",
      },
    },
  },
};

describe("updateProject: inputSchema", () => {
  it("requires a uuid projectId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ projectId: "not-a-uuid" }).success).toBe(
      false,
    );
    expect(inputSchema.safeParse({ projectId: PROJECT_ID }).success).toBe(true);
  });

  it("rejects an unknown state value", () => {
    expect(
      inputSchema.safeParse({ projectId: PROJECT_ID, state: "archived" })
        .success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({ projectId: PROJECT_ID, state: "started" })
        .success,
    ).toBe(true);
  });
});

describe("updateProject: governance", () => {
  it("is an idempotent, non-destructive write", () => {
    expect(definition.annotations?.readOnlyHint).toBe(false);
    expect(definition.annotations?.destructiveHint).toBe(false);
    expect(definition.annotations?.idempotentHint).toBe(true);
  });
});

describe("updateProject: run", () => {
  it("POSTs the ProjectUpdate mutation with id and only set input fields", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(PROJECT_UPDATED);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { projectId: PROJECT_ID, state: "started", name: "Q3 Launch" },
      { fetch: fakeFetch },
    );

    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
      variables: { id: string; input: Record<string, unknown> };
    };
    expect(sent.query).toContain("mutation ProjectUpdate");
    expect(sent.variables.id).toBe(PROJECT_ID);
    expect(sent.variables.input).toEqual({
      state: "started",
      name: "Q3 Launch",
    });
    expect(sent.variables.input).not.toHaveProperty("projectId");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.state).toBe("started");
  });

  it("throws a ConnectorHttpError when Linear returns an errors[] array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "Entity not found: Project" }],
      })) as typeof globalThis.fetch;

    const err = await definition
      .run({ projectId: PROJECT_ID }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain("Entity not found");
  });
});
