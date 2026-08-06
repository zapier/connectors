import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/createProject.ts";

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
const LEAD_ID = "bbbbbbbb-2222-4333-8444-555566667777";

const PROJECT_CREATED = {
  data: {
    projectCreate: {
      success: true,
      project: {
        id: "cccccccc-3333-4444-8555-666677778888",
        name: "Q3 Launch",
        url: "https://linear.app/acme/project/q3-launch",
      },
    },
  },
};

describe("createProject: inputSchema", () => {
  it("requires name and teamIds", () => {
    expect(inputSchema.safeParse({ name: "Q3 Launch" }).success).toBe(false);
    expect(inputSchema.safeParse({ teamIds: [TEAM_ID] }).success).toBe(false);
    expect(
      inputSchema.safeParse({ name: "Q3 Launch", teamIds: [TEAM_ID] }).success,
    ).toBe(true);
  });

  it("rejects a non-uuid teamId", () => {
    expect(
      inputSchema.safeParse({ name: "Q3 Launch", teamIds: ["not-a-uuid"] })
        .success,
    ).toBe(false);
  });
});

describe("createProject: governance", () => {
  it("is a non-destructive, non-idempotent write", () => {
    expect(definition.annotations?.readOnlyHint).toBe(false);
    expect(definition.annotations?.destructiveHint).toBe(false);
    expect(definition.annotations?.idempotentHint).toBe(false);
  });
});

describe("createProject: run", () => {
  it("POSTs the ProjectCreate mutation with only set input fields", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(PROJECT_CREATED);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { name: "Q3 Launch", teamIds: [TEAM_ID], leadId: LEAD_ID },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const sent = JSON.parse(calls[0]?.init?.body as string) as {
      query: string;
      variables: { input: Record<string, unknown> };
    };
    expect(sent.query).toContain("mutation ProjectCreate");
    expect(sent.variables.input).toEqual({
      name: "Q3 Launch",
      teamIds: [TEAM_ID],
      leadId: LEAD_ID,
    });
    expect(sent.variables.input).not.toHaveProperty("description");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(PROJECT_CREATED.data.projectCreate.project.id);
  });

  it("throws a ConnectorHttpError when Linear returns an errors[] array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "Argument Validation Error" }],
      })) as typeof globalThis.fetch;

    const err = await definition
      .run({ name: "Q3 Launch", teamIds: [TEAM_ID] }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain("Validation");
  });
});
