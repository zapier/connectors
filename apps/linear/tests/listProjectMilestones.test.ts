import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import listProjectMilestonesDefinition from "../scripts/listProjectMilestones.ts";

const { inputSchema, outputSchema } = listProjectMilestonesDefinition;

const PROJECT_ID = "55555555-5555-4555-8555-555555555555";

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

const MILESTONES = {
  data: {
    project: {
      projectMilestones: {
        nodes: [
          {
            id: "66666666-6666-4666-8666-666666666666",
            name: "Beta",
            targetDate: "2026-09-01",
          },
        ],
        pageInfo: { hasNextPage: true, endCursor: "cursor-2" },
      },
    },
  },
};

describe("listProjectMilestones: inputSchema", () => {
  it("requires projectId as a uuid", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
    expect(inputSchema.safeParse({ projectId: "abc" }).success).toBe(false);
    expect(inputSchema.safeParse({ projectId: PROJECT_ID }).success).toBe(true);
  });
});

describe("listProjectMilestones: governance", () => {
  it("is read-only", () => {
    expect(listProjectMilestonesDefinition.annotations?.readOnlyHint).toBe(
      true,
    );
    expect(listProjectMilestonesDefinition.annotations?.destructiveHint).toBe(
      false,
    );
  });
});

describe("listProjectMilestones: run", () => {
  it("posts the ProjectMilestones query and maps the nested connection", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(MILESTONES);
    }) as typeof globalThis.fetch;

    const { data: result } = await listProjectMilestonesDefinition.run(
      { projectId: PROJECT_ID },
      { fetch: fakeFetch },
    );

    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body.query).toContain("project(id: $id)");
    expect(body.query).toContain(
      "projectMilestones(first: $first, after: $after)",
    );
    expect(body.variables).toEqual({
      id: PROJECT_ID,
      first: 50,
      after: undefined,
    });

    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.milestones).toHaveLength(1);
    expect(result.nextCursor).toBe("cursor-2");
    expect(result.hasMore).toBe(true);
  });

  it("throws a ConnectorHttpError when Linear returns an errors[] array", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse({
        errors: [{ message: "Entity not found: Project" }],
      })) as typeof globalThis.fetch;

    const err = await listProjectMilestonesDefinition
      .run({ projectId: PROJECT_ID }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).message).toContain("Entity not found");
  });
});
