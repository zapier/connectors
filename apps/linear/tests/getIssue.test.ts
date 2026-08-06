import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import getIssueDefinition from "../scripts/getIssue.ts";

const { inputSchema, outputSchema } = getIssueDefinition;

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

const ISSUE_ID = "8a7b6c5d-1234-4abc-9def-0123456789ab";
const STATE_ID = "1b2c3d4e-5678-4abc-9def-0123456789ab";
const ASSIGNEE_ID = "2c3d4e5f-6789-4abc-9def-0123456789ab";
const TEAM_ID = "3d4e5f60-789a-4abc-9def-0123456789ab";
const LABEL_ID = "4e5f6071-89ab-4abc-9def-0123456789ab";

const ISSUE = {
  id: ISSUE_ID,
  identifier: "ENG-118",
  title: "Fix the login bug",
  url: "https://linear.app/acme/issue/ENG-118",
  description: "Steps to reproduce...",
  priority: 2,
  estimate: 3,
  dueDate: "2026-09-01",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
  state: { id: STATE_ID, name: "In Progress", type: "started" },
  assignee: { id: ASSIGNEE_ID, name: "Ada Lovelace", email: "ada@acme.com" }, // pii:allow
  team: { id: TEAM_ID, name: "Engineering", key: "ENG" },
  project: null,
  labels: {
    nodes: [{ id: LABEL_ID, name: "bug", color: "#ff0000" }],
  },
};

describe("getIssue: inputSchema", () => {
  it("requires issueId", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a valid input (UUID or identifier)", () => {
    expect(inputSchema.safeParse({ issueId: ISSUE_ID }).success).toBe(true);
    expect(inputSchema.safeParse({ issueId: "ENG-118" }).success).toBe(true);
  });
});

describe("getIssue: governance", () => {
  it("is read-only", () => {
    expect(getIssueDefinition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("getIssue: run", () => {
  it("POSTs the issue query and flattens labels.nodes to a plain array", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse({ data: { issue: ISSUE } });
    }) as typeof globalThis.fetch;

    const { data: result } = await getIssueDefinition.run(
      { issueId: "ENG-118" },
      { fetch: fakeFetch },
    );

    expect(calls[0]?.url).toBe("https://api.linear.app/graphql");
    expect(calls[0]?.init?.method).toBe("POST");

    const posted = JSON.parse(calls[0]?.init?.body as string);
    expect(posted.query).toContain("issue(id:");
    expect(posted.variables.id).toBe("ENG-118");

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.id).toBe(ISSUE_ID);
    expect(result.identifier).toBe("ENG-118");
    // labels.nodes is flattened to a plain array on the agent surface.
    expect(Array.isArray(result.labels)).toBe(true);
    expect(result.labels).toEqual([
      { id: LABEL_ID, name: "bug", color: "#ff0000" },
    ]);
  });

  it("returns an empty labels array when the issue has no labels", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        data: { issue: { ...ISSUE, labels: { nodes: [] } } },
      })) as typeof globalThis.fetch;

    const { data: result } = await getIssueDefinition.run(
      { issueId: ISSUE_ID },
      { fetch: fakeFetch },
    );

    expect(result.labels).toEqual([]);
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

    const err = await getIssueDefinition
      .run({ issueId: ISSUE_ID }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toBe("Something failed");
  });
});
