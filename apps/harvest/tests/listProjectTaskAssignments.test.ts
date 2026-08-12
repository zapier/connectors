import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/listProjectTaskAssignments.ts";

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

const CANNED = {
  page: 1,
  total_pages: 1,
  total_entries: 1,
  next_page: null,
  previous_page: null,
  links: {
    first:
      "https://api.harvestapp.com/v2/projects/14308069/task_assignments?page=1&per_page=20",
    next: null,
    previous: null,
    last: "https://api.harvestapp.com/v2/projects/14308069/task_assignments?page=1&per_page=20",
  },
  task_assignments: [
    {
      id: 155505016,
      billable: true,
      is_active: true,
      hourly_rate: 100,
      budget: null,
      project: { id: 14308069, name: "Online Store", code: "OS1" },
      task: { id: 8083365, name: "Graphic Design" },
      created_at: "2021-01-01T00:00:00Z",
      updated_at: "2021-01-01T00:00:00Z",
    },
  ],
};

describe("listProjectTaskAssignments: inputSchema", () => {
  it("accepts a minimal input (project_id only)", () => {
    expect(inputSchema.safeParse({ project_id: 14308069 }).success).toBe(true);
  });

  it("rejects a missing required project_id", () => {
    expect(inputSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-integer project_id", () => {
    expect(inputSchema.safeParse({ project_id: "abc" }).success).toBe(false);
  });
});

describe("listProjectTaskAssignments: governance", () => {
  it("is read-only", () => {
    expect(definition.annotations?.readOnlyHint).toBe(true);
  });
});

describe("listProjectTaskAssignments: run", () => {
  it("GETs /v2/projects/{project_id}/task_assignments with the id in the path", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { project_id: 14308069 },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    // project_id rides in the PATH, not the query string.
    expect(calls[0]?.url).toBe(
      "https://api.harvestapp.com/v2/projects/14308069/task_assignments?per_page=20",
    );
    expect(calls[0]?.url).toContain("/projects/14308069/task_assignments");
    expect(calls[0]?.init?.method).toBe("GET");
    expect(outputSchema.safeParse(result).success).toBe(true);
    expect(result.task_assignments).toHaveLength(1);
  });

  it("carries the is_active filter in the query", async () => {
    const calls: Array<{ url: string }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (url: string) => {
      calls.push({ url });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    await definition.run(
      { project_id: 14308069, is_active: true },
      { fetch: fakeFetch },
    );

    const url = new URL(calls[0]?.url as string);
    expect(url.searchParams.get("is_active")).toBe("true");
  });

  it("sets the User-Agent header", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    await definition.run({ project_id: 14308069 }, { fetch: fakeFetch });

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
  });

  it("throws a ConnectorHttpError carrying status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Not Found" },
        { status: 404 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({ project_id: 999 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(404);
  });
});
