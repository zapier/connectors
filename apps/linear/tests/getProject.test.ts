import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/getProject.ts";

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

const PROJECT = {
  data: {
    project: {
      id: PROJECT_ID,
      name: "Q3 Launch",
      description: "Ship the Q3 launch.",
      url: "https://linear.app/acme/project/q3-launch",
      state: "started",
    },
  },
};

describe("getProject: inputSchema", () => {
  it("requires a uuid projectId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ projectId: "abc" }).success).toBe(false);
    expect(inputSchema.safeParse({ projectId: PROJECT_ID }).success).toBe(true);
  });
});

describe("getProject: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
    expect(definition.annotations?.destructiveHint).toBe(false);
  });
});

describe("getProject: run", () => {
  it("POSTs the Project query and returns the parsed project", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(PROJECT);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { projectId: PROJECT_ID },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
      variables: Record<string, unknown>;
    };
    expect(sent.query).toContain("query Project");
    expect(sent.variables).toMatchObject({ id: PROJECT_ID });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(PROJECT_ID);
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
