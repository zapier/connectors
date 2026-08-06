import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/createProjectUpdate.ts";

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

const UPDATE_CREATED = {
  data: {
    projectUpdateCreate: {
      success: true,
      projectUpdate: {
        id: "dddddddd-4444-4555-8666-777788889999",
        url: "https://linear.app/acme/project/q3-launch/update/1",
      },
    },
  },
};

describe("createProjectUpdate: inputSchema", () => {
  it("requires a uuid projectId and body", () => {
    expect(inputSchema.safeParse({ body: "On track." }).success).toBe(false);
    expect(inputSchema.safeParse({ projectId: PROJECT_ID }).success).toBe(
      false,
    );
    expect(
      inputSchema.safeParse({ projectId: PROJECT_ID, body: "On track." })
        .success,
    ).toBe(true);
  });

  it("rejects an unknown health value", () => {
    expect(
      inputSchema.safeParse({
        projectId: PROJECT_ID,
        body: "x",
        health: "unknown",
      }).success,
    ).toBe(false);
    expect(
      inputSchema.safeParse({
        projectId: PROJECT_ID,
        body: "x",
        health: "atRisk",
      }).success,
    ).toBe(true);
  });
});

describe("createProjectUpdate: governance", () => {
  it("is a non-idempotent write", () => {
    expect(definition.annotations?.readOnlyHint).toBe(false);
    expect(definition.annotations?.destructiveHint).toBe(false);
    expect(definition.annotations?.idempotentHint).toBe(false);
  });
});

describe("createProjectUpdate: run", () => {
  it("POSTs the ProjectUpdateCreate mutation with only set input fields", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(UPDATE_CREATED);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { projectId: PROJECT_ID, body: "On track.", health: "onTrack" },
      { fetch: fakeFetch },
    );

    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
      variables: { input: Record<string, unknown> };
    };
    expect(sent.query).toContain("mutation ProjectUpdateCreate");
    expect(sent.variables.input).toEqual({
      projectId: PROJECT_ID,
      body: "On track.",
      health: "onTrack",
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(
      UPDATE_CREATED.data.projectUpdateCreate.projectUpdate.id,
    );
  });

  it("omits health from the input when not provided", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(UPDATE_CREATED);
    }) as typeof globalThis.fetch;

    await definition.run(
      { projectId: PROJECT_ID, body: "On track." },
      { fetch: fakeFetch },
    );

    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      variables: { input: Record<string, unknown> };
    };
    expect(sent.variables.input).not.toHaveProperty("health");
  });

  it("throws a ConnectorHttpError when Linear returns an errors[] array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "Entity not found: Project" }],
      })) as typeof globalThis.fetch;

    const err = await definition
      .run({ projectId: PROJECT_ID, body: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain("Entity not found");
  });
});
