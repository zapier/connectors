import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import createIssueDefinition from "../scripts/createIssue.ts";

const { inputSchema, outputSchema } = createIssueDefinition;

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

const TEAM_ID = "8a7b6c5d-1234-4abc-9def-0123456789ab";
const ISSUE_ID = "1b2c3d4e-5678-4abc-9def-0123456789ab";

const ISSUE = {
  id: ISSUE_ID,
  identifier: "ENG-118",
  title: "Fix the login bug",
  url: "https://linear.app/acme/issue/ENG-118",
};

describe("createIssue: inputSchema", () => {
  it("requires teamId and title", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ teamId: TEAM_ID }).success).toBe(false);
    expect(inputSchema.safeParse({ title: "Fix the login bug" }).success).toBe(
      false,
    );
  });

  it("accepts a valid input with just the required fields", () => {
    expect(
      inputSchema.safeParse({ teamId: TEAM_ID, title: "Fix the login bug" })
        .success,
    ).toBe(true);
  });

  it("accepts the documented optional fields", () => {
    expect(
      inputSchema.safeParse({
        teamId: TEAM_ID,
        title: "Fix the login bug",
        description: "Steps to reproduce...",
        priority: 2,
        dueDate: "2026-09-01",
      }).success,
    ).toBe(true);
  });
});

describe("createIssue: governance", () => {
  it("is a write (not read-only)", () => {
    expect(createIssueDefinition.annotations?.readOnlyHint).toBe(false);
  });
});

describe("createIssue: run", () => {
  it("POSTs the issueCreate mutation to the Linear GraphQL endpoint and returns the created issue", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: { issueCreate: { success: true, issue: ISSUE } },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await createIssueDefinition.run(
      { teamId: TEAM_ID, title: "Fix the login bug" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");

    const posted = JSON.parse(calls[0]?.init?.body as string);
    expect(posted.query).toContain("issueCreate");
    // The mutation posts the whole input under variables.input.
    expect(posted.variables.input.teamId).toBe(TEAM_ID);
    expect(posted.variables.input.title).toBe("Fix the login bug");
    // Unset optionals are omitted from the posted input.
    expect(posted.variables.input.description).toBeUndefined();
    expect(posted.variables.input.priority).toBeUndefined();
    expect(posted.variables.input.assigneeId).toBeUndefined();

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(ISSUE_ID);
    expect(result.identifier).toBe("ENG-118");
  });

  it("throws a ConnectorHttpError when Linear returns a top-level errors array (HTTP 200)", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [
          {
            message: "Something failed",
            extensions: { userPresentableMessage: "Something failed" },
          },
        ],
      })) as typeof globalThis.fetch;

    const err = await createIssueDefinition
      .run(
        { teamId: TEAM_ID, title: "Fix the login bug" },
        { fetch: fakeFetch },
      )
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toBe("Something failed");
  });
});
