import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import updateIssueDefinition from "../scripts/updateIssue.ts";

const { inputSchema, outputSchema } = updateIssueDefinition;

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

const ISSUE = {
  id: "1429989f-e8ac-4eff-bc8f-57f56486db54",
  identifier: "ENG-118",
  title: "Updated title",
  url: "https://linear.app/acme/issue/ENG-118",
};

describe("updateIssue: inputSchema", () => {
  it("requires issueId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ issueId: "ENG-118" }).success).toBe(true);
  });

  it("allows null for assigneeId/projectId/dueDate", () => {
    expect(
      inputSchema.safeParse({
        issueId: "ENG-118",
        assigneeId: null,
        projectId: null,
        dueDate: null,
      }).success,
    ).toBe(true);
  });
});

describe("updateIssue: governance", () => {
  it("is a non-destructive, idempotent write", () => {
    expect(updateIssueDefinition.annotations?.readOnlyHint).toBe(false);
    expect(updateIssueDefinition.annotations?.destructiveHint).toBe(false);
    expect(updateIssueDefinition.annotations?.idempotentHint).toBe(true);
  });
});

describe("updateIssue: run", () => {
  it("POSTs the IssueUpdate mutation and returns the parsed issue", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({
        data: { issueUpdate: { success: true, issue: ISSUE } },
      });
    }) as typeof globalThis.fetch;

    const { data: result } = await updateIssueDefinition.run(
      {
        issueId: "ENG-118",
        title: "Updated title",
        priority: 2,
        assigneeId: null,
      },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain("IssueUpdate");
    expect(body.variables.id).toBe("ENG-118");
    expect(body.variables.input.title).toBe("Updated title");
    expect(body.variables.input.priority).toBe(2);
    // null must be forwarded to clear the assignee.
    expect(body.variables.input.assigneeId).toBeNull();
    // Untouched fields must be absent from the input payload.
    expect("stateId" in body.variables.input).toBe(false);
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.identifier).toBe("ENG-118");
  });

  it("throws a ConnectorHttpError when Linear returns an errors array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "nope" }],
      })) as typeof globalThis.fetch;

    const err = await updateIssueDefinition
      .run({ issueId: "ENG-118", title: "x" }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain("nope");
  });
});
