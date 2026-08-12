import {
  type ConnectorHttpError,
  isConnectorHttpError,
} from "@zapier/connectors-sdk";
import { describe, expect, it } from "vitest";

import definition from "../scripts/createProjectTaskAssignment.ts";

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
  id: 155505016,
  billable: true,
  is_active: true,
  hourly_rate: 100,
  budget: null,
  project: { id: 14308069, name: "Online Store", code: "OS1" },
  task: { id: 8083365, name: "Graphic Design" },
  created_at: "2021-01-01T00:00:00Z",
  updated_at: "2021-01-01T00:00:00Z",
};

describe("createProjectTaskAssignment: inputSchema", () => {
  it("accepts a minimal input (project_id + task_id)", () => {
    expect(
      inputSchema.safeParse({ project_id: 14308069, task_id: 8083365 }).success,
    ).toBe(true);
  });

  it("rejects a missing required task_id", () => {
    expect(inputSchema.safeParse({ project_id: 14308069 }).success).toBe(false);
  });

  it("rejects a missing required project_id", () => {
    expect(inputSchema.safeParse({ task_id: 8083365 }).success).toBe(false);
  });
});

describe("createProjectTaskAssignment: governance", () => {
  it("is not read-only and not destructive", () => {
    expect(definition.annotations?.readOnlyHint).toBe(false);
    expect(definition.annotations?.destructiveHint).toBe(false);
  });
});

describe("createProjectTaskAssignment: run", () => {
  it("POSTs to /v2/projects/{project_id}/task_assignments with task_id in the body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      url: string,
      init?: RequestInit,
    ) => {
      calls.push({ url, init });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    const { data: result } = await definition.run(
      { project_id: 14308069, task_id: 8083365, billable: true },
      { fetch: fakeFetch },
    );

    expect(calls).toHaveLength(1);
    // project_id in the PATH; task_id in the body.
    expect(calls[0]?.url).toBe(
      "https://api.harvestapp.com/v2/projects/14308069/task_assignments",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    const body = JSON.parse(calls[0]?.init?.body as string);
    expect(body).toEqual({ task_id: 8083365, billable: true });
    // project_id is not repeated in the body — it's a path param.
    expect(body).not.toHaveProperty("project_id");
    expect(body).not.toHaveProperty("hourly_rate");
    expect(outputSchema.safeParse(result).success).toBe(true);
  });

  it("sets the User-Agent and Content-Type headers", async () => {
    const calls: Array<{ init: RequestInit | undefined }> = [];
    const fakeFetch: typeof globalThis.fetch = (async (
      _url: string,
      init?: RequestInit,
    ) => {
      calls.push({ init });
      return jsonResponse(CANNED);
    }) as typeof globalThis.fetch;

    await definition.run(
      { project_id: 14308069, task_id: 8083365 },
      { fetch: fakeFetch },
    );

    const headers = calls[0]?.init?.headers as Headers;
    expect(headers.get("User-Agent")).toContain("Harvest");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("throws a ConnectorHttpError carrying status + body on non-OK", async () => {
    const fakeFetch: typeof globalThis.fetch = (async () =>
      jsonResponse(
        { message: "Task has already been taken" },
        { status: 422 },
      )) as typeof globalThis.fetch;

    const err = await definition
      .run({ project_id: 14308069, task_id: 8083365 }, { fetch: fakeFetch })
      .catch((e: unknown) => e);

    expect(isConnectorHttpError(err)).toBe(true);
    expect((err as ConnectorHttpError).response.status).toBe(422);
  });
});
